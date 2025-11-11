import React from 'react';
import { APP_VERSION, FOOTER_TEXT } from '../../../constants';
import styles from '../Footer.module.scss';

export const FooterInfo: React.FC = () => {
  return (
    <div className={styles.info}>
      <p>
        {FOOTER_TEXT} <span>· {APP_VERSION} 💛</span>
      </p>
    </div>
  );
};
