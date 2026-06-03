from backend.rag.citations import build_citations


def test_build_citations_deduplicates_same_doc_source_page():
    chunks = [
        {"metadata": {"doc_id": "doc-1", "source": "a.pdf", "page": 1}},
        {"metadata": {"doc_id": "doc-1", "source": "a.pdf", "page": 1}},
    ]

    citations = build_citations(chunks)

    assert citations == [
        {"source": "a.pdf", "page": "1", "doc_id": "doc-1"}
    ]


def test_build_citations_keeps_same_filename_from_different_docs():
    chunks = [
        {"metadata": {"doc_id": "doc-1", "source": "a.pdf", "page": 1}},
        {"metadata": {"doc_id": "doc-2", "source": "a.pdf", "page": 1}},
    ]

    citations = build_citations(chunks)

    assert len(citations) == 2


def test_build_citations_handles_missing_metadata():
    citations = build_citations([{}])

    assert citations == [{"source": "", "page": ""}]