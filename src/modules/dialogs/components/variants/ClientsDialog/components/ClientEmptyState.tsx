/**
 * ClientEmptyState Component
 *
 * Displayed when there are no clients in the system.
 */

'use client';

import { Building2 } from 'lucide-react';
import styles from '../../UsersDialog/UsersDialog.module.scss';

export function ClientEmptyState() {
  return (
    <div className={styles.emptyState}>
      <Building2 size={48} className={styles.emptyIcon} />
      <p className={styles.emptyText}>No hay cuentas en el sistema</p>
      <p className={styles.emptySubtext}>Crea una nueva cuenta para comenzar</p>
    </div>
  );
}
