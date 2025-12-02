/**
 * Calendar Component (React Aria Components)
 * 
 * Calendario modular usando react-aria-components con estilos SCSS
 * Sin dependencias de Tailwind
 * 
 * @module components/ui/calendar
 */

'use client';

import { getLocalTimeZone, today } from '@internationalized/date';
import { ComponentProps } from 'react';
import {
  Button,
  CalendarCell as CalendarCellRac,
  CalendarGridBody as CalendarGridBodyRac,
  CalendarGridHeader as CalendarGridHeaderRac,
  CalendarGrid as CalendarGridRac,
  CalendarHeaderCell as CalendarHeaderCellRac,
  Calendar as CalendarRac,
  Heading as HeadingRac,
  RangeCalendar as RangeCalendarRac,
  composeRenderProps,
} from 'react-aria-components';
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import styles from './Calendar.module.scss';

interface BaseCalendarProps {
  className?: string;
}

type CalendarProps = ComponentProps<typeof CalendarRac> & BaseCalendarProps;
type RangeCalendarProps = ComponentProps<typeof RangeCalendarRac> & BaseCalendarProps;

function CalendarHeader() {
  return (
    <header className={styles.calendarHeader}>
      <Button slot="previous" className={styles.navButton}>
        <ChevronLeftIcon />
      </Button>
      <HeadingRac className={styles.heading} />
      <Button slot="next" className={styles.navButton}>
        <ChevronRightIcon />
      </Button>
    </header>
  );
}

function CalendarGridComponent({ isRange = false }: { isRange?: boolean }) {
  const now = today(getLocalTimeZone());

  return (
    <CalendarGridRac className={styles.grid}>
      <CalendarGridHeaderRac className={styles.gridHeader}>
        {(day) => (
          <CalendarHeaderCellRac className={styles.headerCell}>
            {day}
          </CalendarHeaderCellRac>
        )}
      </CalendarGridHeaderRac>
      <CalendarGridBodyRac className={styles.gridBody}>
        {(date) => {
          const isToday = date.compare(now) === 0;
          const cellClasses = [
            styles.cell,
            isRange ? styles.cellRange : '',
            isToday ? (isRange ? styles.cellTodayRange : styles.cellToday) : '',
          ].filter(Boolean).join(' ');

          return (
            <CalendarCellRac
              date={date}
              className={cellClasses}
            />
          );
        }}
      </CalendarGridBodyRac>
    </CalendarGridRac>
  );
}

function Calendar({ className, ...props }: CalendarProps) {
  return (
    <CalendarRac
      {...props}
      className={composeRenderProps(className, (className) =>
        [styles.calendar, className].filter(Boolean).join(' ')
      )}
    >
      <CalendarHeader />
      <CalendarGridComponent />
    </CalendarRac>
  );
}

function RangeCalendar({ className, ...props }: RangeCalendarProps) {
  return (
    <RangeCalendarRac
      {...props}
      className={composeRenderProps(className, (className) =>
        [styles.calendar, className].filter(Boolean).join(' ')
      )}
    >
      <CalendarHeader />
      <CalendarGridComponent isRange />
    </RangeCalendarRac>
  );
}

export { Calendar, RangeCalendar };
export type { CalendarProps, RangeCalendarProps };
