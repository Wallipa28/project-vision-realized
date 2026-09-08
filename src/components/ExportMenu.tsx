import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportRows, printReport } from "@/lib/export";
import { toast } from "sonner";

export function ExportMenu({
  rows,
  fileName,
}: {
  rows: Record<string, unknown>[];
  fileName: string;
}) {
  function run(format: "xlsx" | "csv") {
    if (!rows.length) {
      toast.error("ไม่มีข้อมูลสำหรับส่งออก");
      return;
    }
    exportRows(rows, fileName, format);
    toast.success(`ส่งออก ${rows.length.toLocaleString("th-TH")} รายการเรียบร้อย`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="secondary">
          <Download className="size-4" /> ส่งออกรายงาน
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => run("xlsx")}>
          <FileSpreadsheet className="size-4" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("csv")}>
          <FileText className="size-4" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={printReport}>
          <Printer className="size-4" /> PDF (พิมพ์หน้านี้)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
