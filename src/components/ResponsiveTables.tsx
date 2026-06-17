import { useEffect } from 'react';
import { Page } from '../types';

interface ResponsiveTablesProps {
  page: Page;
}

export default function ResponsiveTables({ page }: ResponsiveTablesProps) {
  useEffect(() => {
    const applyLabels = () => {
      document.querySelectorAll<HTMLTableElement>('main table').forEach(table => {
        table.classList.add('responsive-card-table');
        const labels = Array.from(table.querySelectorAll('thead th')).map(th =>
          th.textContent?.replace(/\s+/g, ' ').trim() || ''
        );

        table.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach(row => {
          Array.from(row.children).forEach((cell, index) => {
            if (cell instanceof HTMLTableCellElement) {
              cell.dataset.label = labels[index] || '';
            }
          });
        });
      });
    };

    applyLabels();

    const observer = new MutationObserver(applyLabels);
    const main = document.querySelector('main');
    if (main) {
      observer.observe(main, { childList: true, subtree: true });
    }

    return () => observer.disconnect();
  }, [page]);

  return null;
}
