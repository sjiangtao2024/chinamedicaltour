import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

import result_files


class ResultFileSelectionTests(unittest.TestCase):
    def test_find_pdf_result_prefers_pdf_over_glossary(self):
        with self.subTest("selects pdf result"):
            temp_dir = Path(self._get_temp_dir())
            task_id = "task-123"
            glossary = temp_dir / f"{task_id}.no_watermark.zh.glossary.csv"
            pdf = temp_dir / f"{task_id}.no_watermark.zh.pdf"

            glossary.write_text("glossary")
            pdf.write_text("pdf")

            selected = result_files.find_pdf_result(temp_dir, task_id)

            self.assertEqual(selected, pdf)

    def test_find_pdf_result_returns_none_without_pdf(self):
        temp_dir = Path(self._get_temp_dir())
        task_id = "task-456"
        glossary = temp_dir / f"{task_id}.no_watermark.zh.glossary.csv"
        glossary.write_text("glossary")

        selected = result_files.find_pdf_result(temp_dir, task_id)

        self.assertIsNone(selected)

    def _get_temp_dir(self):
        import tempfile

        return tempfile.mkdtemp(prefix="babeldoc-tests-")


if __name__ == "__main__":
    unittest.main()
