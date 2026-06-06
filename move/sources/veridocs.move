module sui_veridocs::veridocs {
    use sui::dynamic_field;
    use std::string::String;

    // The shared registry object holding all notarized dynamic fields
    public struct NotaryRegistry has key {
        id: UID,
    }

    // Struct holding metadata for each notarized document
    public struct DocumentRecord has store, drop {
        name: String,
        blob_id: String,
        timestamp: u64,
        author: address,
    }

    // Admin capability
    public struct AdminCap has key, store {
        id: UID,
    }

    fun init(ctx: &mut TxContext) {
        let registry = NotaryRegistry {
            id: object::new(ctx),
        };
        // Share the registry globally so everyone can read and register documents
        transfer::share_object(registry);

        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        transfer::public_transfer(admin_cap, tx_context::sender(ctx));
    }

    // Public entry function to register a document.
    // The key is the SHA-256 hash (String), and the value is the DocumentRecord metadata.
    public entry fun register_document(
        registry: &mut NotaryRegistry,
        hash: String,
        name: String,
        blob_id: String,
        timestamp: u64,
        ctx: &mut TxContext
    ) {
        let record = DocumentRecord {
            name,
            blob_id,
            timestamp,
            author: tx_context::sender(ctx),
        };
        
        // Add as dynamic field directly to the registry UID.
        // If a document is already notarized (hash key already exists), this will abort.
        dynamic_field::add(&mut registry.id, hash, record);
    }
}
