def build_citations(chunks: list[dict]) -> list[dict[str, str]]:
    seen = set()
    citations = []

    for chunk in chunks:
        metadata = chunk.get("metadata", {})
        source = str(metadata.get("source", ""))
        page = str(metadata.get("page", ""))
        doc_id = metadata.get("doc_id")

        key = (doc_id, source, page)
        if key in seen:
            continue

        seen.add(key)

        citation = {
            "source": source,
            "page": page,
        }

        if doc_id:
            citation["doc_id"] = str(doc_id)

        citations.append(citation)

    return citations