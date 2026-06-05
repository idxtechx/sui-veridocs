
export async function GET(
  req: Request,
  { params }: { params: Promise<{ blobId: string }> }
) {
  try {
    const { blobId } = await params;
    const url = new URL(req.url);
    const fileName = url.searchParams.get('name') || '';

    // Fetch the raw blob from the Walrus aggregator
    const aggregatorUrl = `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`;
    const res = await fetch(aggregatorUrl);

    if (!res.ok) {
      return new Response(`Error fetching blob from Walrus: ${res.statusText}`, { status: res.status });
    }

    const data = await res.arrayBuffer();

    // Determine the Content-Type based on the filename
    let contentType = 'application/octet-stream';
    const lowerName = fileName.toLowerCase();

    if (lowerName.endsWith('.pdf')) {
      contentType = 'application/pdf';
    } else if (lowerName.endsWith('.png')) {
      contentType = 'image/png';
    } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (lowerName.endsWith('.gif')) {
      contentType = 'image/gif';
    } else if (lowerName.endsWith('.svg')) {
      contentType = 'image/svg+xml';
    } else if (lowerName.endsWith('.txt')) {
      contentType = 'text/plain';
    } else if (lowerName.endsWith('.html')) {
      contentType = 'text/html';
    }

    // Return the binary data with the correct content type
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(`Server error: ${errorMessage}`, { status: 500 });
  }
}
