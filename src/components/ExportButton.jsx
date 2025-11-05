import * as XLSX from 'xlsx';

export default function ExportButton({ rows = [], filename = 'export.xlsx', children }) {
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, filename);
  };

  return (
    <button
      type="button"
      className="btn-primary glow-interactive"
      onClick={handleExport}
    >
      Export to Excel
    </button>
  );
}
