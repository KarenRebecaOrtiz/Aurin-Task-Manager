import React from 'react';
import { useFeedbackForm } from '../../hooks';
import { FooterInfo, FeedbackForm, LogoSection, QuickLinks } from './components';
import styles from './Footer.module.scss';

const Footer: React.FC = () => {
  const { feedback, isSubmitting, message, setFeedback, handleSubmit } = useFeedbackForm();

  return (
    <footer className={styles.footer} style={{ zIndex: 1000 }}>
      <LogoSection />
      <div className={styles.footerContent}>
        <FooterInfo />
        <FeedbackForm
          feedback={feedback}
          isSubmitting={isSubmitting}
          onFeedbackChange={setFeedback}
          onSubmit={handleSubmit}
        />
        {message && <p className={styles.message}>{message}</p>}
      </div>
    </footer>
  );
};

export default Footer;
