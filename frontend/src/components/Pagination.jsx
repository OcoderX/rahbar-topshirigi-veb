export default function Pagination({ page, limit, total, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="pager">
      <span>
        {total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}
      </span>
      <div className="controls">
        <button
          className="btn btn-sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          ← Prev
        </button>
        <span className="muted">
          Page {page} / {totalPages}
        </span>
        <button
          className="btn btn-sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
