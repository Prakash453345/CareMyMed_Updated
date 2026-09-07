import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Modal, Dimensions } from 'react-native';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["S", "M", "T", "W", "T", "F", "S"];

export default function CustomCalendarPicker({
  visible,
  onClose,
  onSelectDate,
  initialDate,
  maximumDate,
  minimumDate,
  title = "Select Date"
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = initialDate ? new Date(initialDate) : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  });

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = initialDate ? new Date(initialDate) : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  });

  useEffect(() => {
    if (visible && initialDate) {
      const d = new Date(initialDate);
      if (!isNaN(d.getTime())) {
        setSelectedDate(d);
        setCurrentMonth(d);
      }
    }
  }, [visible, initialDate]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const firstDayOfWeek = useMemo(() => new Date(year, month, 1).getDay(), [year, month]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const isDateDisabled = (dayNum) => {
    const dateToCheck = new Date(year, month, dayNum);
    dateToCheck.setHours(23, 59, 59, 999);

    if (maximumDate) {
      const max = new Date(maximumDate);
      max.setHours(23, 59, 59, 999);
      if (dateToCheck > max) return true;
    }
    if (minimumDate) {
      const min = new Date(minimumDate);
      min.setHours(0, 0, 0, 0);
      const checkMin = new Date(year, month, dayNum, 0, 0, 0, 0);
      if (checkMin < min) return true;
    }
    return false;
  };

  const handleSelectDay = (dayNum) => {
    if (isDateDisabled(dayNum)) return;
    const newDate = new Date(selectedDate || new Date());
    newDate.setFullYear(year);
    newDate.setMonth(month);
    newDate.setDate(dayNum);
    setSelectedDate(newDate);
  };

  const handleConfirm = () => {
    onSelectDate(selectedDate || new Date());
    onClose();
  };

  if (!visible) return null;

  const isSameDay = (dayNum) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === dayNum
    );
  };

  const isToday = (dayNum) => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === dayNum
    );
  };

  const gridCells = [];
  // Empty leading cells
  for (let i = 0; i < firstDayOfWeek; i++) {
    gridCells.push(<View key={`empty-${i}`} style={styles.dayCell} />);
  }
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const disabled = isDateDisabled(day);
    const selected = isSameDay(day);
    const today = isToday(day);

    gridCells.push(
      <Pressable
        key={`day-${day}`}
        disabled={disabled}
        onPress={() => handleSelectDay(day)}
        style={[
          styles.dayCell,
          selected && styles.selectedDayCell,
          today && !selected && styles.todayDayCell,
        ]}
      >
        <Text
          style={[
            styles.dayText,
            disabled && styles.disabledDayText,
            selected && styles.selectedDayText,
            today && !selected && styles.todayDayText,
          ]}
        >
          {day}
        </Text>
      </Pressable>
    );
  }

  const formattedHeaderDate = (selectedDate || new Date()).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Top Banner */}
          <View style={styles.headerBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CalendarIcon size={18} color="#C084FC" />
              <Text style={styles.bannerSubTitle}>{title}</Text>
            </View>
            <Text style={styles.bannerDateText}>{formattedHeaderDate}</Text>
          </View>

          {/* Month / Year Navigator */}
          <View style={styles.navRow}>
            <Pressable onPress={handlePrevMonth} style={styles.navBtn} hitSlop={10}>
              <ChevronLeft size={20} color="#1E293B" />
            </Pressable>
            <Text style={styles.monthYearTitle}>
              {MONTH_NAMES[month]} {year}
            </Text>
            <Pressable onPress={handleNextMonth} style={styles.navBtn} hitSlop={10}>
              <ChevronRight size={20} color="#1E293B" />
            </Pressable>
          </View>

          {/* Days of Week Row */}
          <View style={styles.weekRow}>
            {DAYS_OF_WEEK.map((d, idx) => (
              <Text key={idx} style={styles.weekDayText}>
                {d}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.grid}>{gridCells}</View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </Pressable>
            <Pressable onPress={handleConfirm} style={styles.confirmBtn}>
              <Text style={styles.confirmBtnText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 40, 360),
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  headerBanner: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  bannerSubTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E0E7FF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bannerDateText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  weekDayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 20,
  },
  selectedDayCell: {
    backgroundColor: '#6366F1',
  },
  todayDayCell: {
    borderWidth: 1.5,
    borderColor: '#6366F1',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  disabledDayText: {
    color: '#CBD5E1',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  todayDayText: {
    color: '#6366F1',
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
