export default function Pagination({ page, limit, total, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="pager">
      <span>
        {total === 0 ? 'Natija topilmadi' : `${total} tadan ${from}–${to} ko‘rsatilmoqda`}
      </span>
      <div className="controls">
        <button
          className="btn btn-sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          ← Oldingi
        </button>
        <span className="muted">
          {page} / {totalPages} sahifa
        </span>
        <button
          className="btn btn-sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Keyingi →
        </button>
      </div>
    </div>
  );
}
