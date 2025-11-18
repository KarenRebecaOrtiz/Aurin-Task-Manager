'use client';

import React from 'react';
import styles from './Typography.module.scss';

// H1 - Main page heading
export const H1: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <h1 className={`${styles.h1} ${className}`}>{children}</h1>
);

// H2 - Section heading
export const H2: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <h2 className={`${styles.h2} ${className}`}>{children}</h2>
);

// H3 - Subsection heading
export const H3: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <h3 className={`${styles.h3} ${className}`}>{children}</h3>
);

// H4 - Minor heading
export const H4: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <h4 className={`${styles.h4} ${className}`}>{children}</h4>
);

// P - Paragraph text
export const P: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <p className={`${styles.p} ${className}`}>{children}</p>
);

// Lead - Large introductory text
export const Lead: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <p className={`${styles.lead} ${className}`}>{children}</p>
);

// Large - Large text with semibold weight
export const Large: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`${styles.large} ${className}`}>{children}</div>
);

// Small - Small text with medium weight
export const Small: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <small className={`${styles.small} ${className}`}>{children}</small>
);

// Muted - Muted secondary text
export const Muted: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <p className={`${styles.muted} ${className}`}>{children}</p>
);

// InlineCode - Inline code snippet
export const InlineCode: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <code className={`${styles.inlineCode} ${className}`}>{children}</code>
);

// Blockquote - Block quote
export const Blockquote: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <blockquote className={`${styles.blockquote} ${className}`}>{children}</blockquote>
);

// List - Unordered list
export const List: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <ul className={`${styles.list} ${className}`}>{children}</ul>
);

// ListItem - List item
export const ListItem: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <li className={`${styles.listItem} ${className}`}>{children}</li>
);
