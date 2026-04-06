import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Platform, InputModeOptions } from 'react-native';
import { Colors, FontFamily, FontSize, Radius } from '../../theme';
import { format, isValid, set } from 'date-fns';
import { MaterialIcons } from '@expo/vector-icons';

interface WebDateSegmentInputProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  error?: boolean;
  mode?: 'datetime' | 'date' | 'time';
}

interface InputFieldProps {
  val: string;
  setter: (s: string) => void;
  refObj: React.RefObject<TextInput | null>;
  next?: React.RefObject<TextInput | null>;
  prev?: React.RefObject<TextInput | null>;
  len: number;
  placeholder: string;
  onBlur: () => void;
  onTextChange: (text: string, setter: (s: string) => void, nextRef?: React.RefObject<TextInput | null>, maxLen?: number) => void;
  onKeyPress: (e: any, prevRef?: React.RefObject<TextInput | null>, currentVal?: string) => void;
}

const InputField: React.FC<InputFieldProps> = ({
  val,
  setter,
  refObj,
  next,
  prev,
  len,
  placeholder,
  onBlur,
  onTextChange,
  onKeyPress
}) => (
  <TextInput
    ref={refObj}
    style={[styles.segmentInput, len === 4 && styles.yearInput]}
    value={val}
    onChangeText={(t) => onTextChange(t, setter, next, len)}
    onKeyPress={(e) => onKeyPress(e, prev, val)}
    onBlur={onBlur}
    keyboardType="number-pad"
    maxLength={len}
    placeholder={placeholder}
    placeholderTextColor={Colors.outlineVariant}
    // @ts-ignore - web only for better usability
    selectTextOnFocus={true}
  />
);

export const WebDateSegmentInput: React.FC<WebDateSegmentInputProps> = ({
  value,
  onChange,
  label,
  error,
  mode = 'datetime'
}) => {
  // Use local state for UI updates
  const [hh, setHh] = useState(format(value, 'HH'));
  const [mm, setMm] = useState(format(value, 'mm'));
  const [dd, setDd] = useState(format(value, 'dd'));
  const [MM, setMM] = useState(format(value, 'MM'));
  const [yyyy, setYyyy] = useState(format(value, 'yyyy'));

  // Use Ref for synchronous access in onBlur
  const valuesRef = useRef({
    hh: format(value, 'HH'),
    mm: format(value, 'mm'),
    dd: format(value, 'dd'),
    MM: format(value, 'MM'),
    yyyy: format(value, 'yyyy')
  });

  useEffect(() => {
    const newHh = format(value, 'HH');
    const newMm = format(value, 'mm');
    const newDd = format(value, 'dd');
    const newMM = format(value, 'MM');
    const newYyyy = format(value, 'yyyy');

    setHh(newHh);
    setMm(newMm);
    setDd(newDd);
    setMM(newMM);
    setYyyy(newYyyy);

    valuesRef.current = { hh: newHh, mm: newMm, dd: newDd, MM: newMM, yyyy: newYyyy };
  }, [value]);

  const hRef = useRef<TextInput>(null);
  const mRef = useRef<TextInput>(null);
  const dRef = useRef<TextInput>(null);
  const moRef = useRef<TextInput>(null);
  const yRef = useRef<TextInput>(null);

  const updateDate = () => {
    const { hh, mm, dd, MM, yyyy } = valuesRef.current;
    
    let d = new Date(value);
    const hNum = parseInt(hh) || 0;
    const minNum = parseInt(mm) || 0;
    const dNum = parseInt(dd) || 1;
    const moNum = parseInt(MM) ? parseInt(MM) - 1 : 0;
    const yNum = parseInt(yyyy) || d.getFullYear();

    // Use set from date-fns to update all parts at once safely
    const newDate = set(d, {
      year: mode === 'time' ? d.getFullYear() : yNum,
      month: mode === 'time' ? d.getMonth() : Math.min(11, Math.max(0, moNum)),
      date: mode === 'time' ? d.getDate() : Math.min(31, Math.max(1, dNum)),
      hours: mode === 'date' ? d.getHours() : Math.min(23, Math.max(0, hNum)),
      minutes: mode === 'date' ? d.getMinutes() : Math.min(59, Math.max(0, minNum))
    });

    if (isValid(newDate)) {
      onChange(newDate);
    }
  };

  const handleTextChange = (text: string, setter: (s: string) => void, nextRef?: React.RefObject<TextInput | null>, maxLen: number = 2) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, maxLen);
    
    // Update local state for UI
    setter(cleaned);
    
    // Update Ref for synchronous access
    if (setter === setHh) valuesRef.current.hh = cleaned;
    if (setter === setMm) valuesRef.current.mm = cleaned;
    if (setter === setDd) valuesRef.current.dd = cleaned;
    if (setter === setMM) valuesRef.current.MM = cleaned;
    if (setter === setYyyy) valuesRef.current.yyyy = cleaned;

    if (cleaned.length === maxLen && nextRef?.current) {
      nextRef.current.focus();
    }
  };

  const handleKeyPress = (e: any, prevRef?: React.RefObject<TextInput | null>, currentVal?: string) => {
    if (e.nativeEvent.key === 'Backspace' && currentVal === '' && prevRef?.current) {
      prevRef.current.focus();
    }
  };

  const showTime = mode === 'datetime' || mode === 'time';
  const showDate = mode === 'datetime' || mode === 'date';

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, error && styles.inputError]}>
        {showTime && (
          <View style={styles.group}>
            <InputField 
              val={hh} setter={setHh} refObj={hRef} next={showDate ? mRef : (mode === 'time' ? mRef : undefined)} placeholder="HH" len={2} 
              onBlur={updateDate} onTextChange={handleTextChange} onKeyPress={handleKeyPress}
            />
            <Text style={styles.separator}>:</Text>
            <InputField 
              val={mm} setter={setMm} refObj={mRef} next={showDate ? dRef : undefined} prev={hRef} placeholder="mm" len={2} 
              onBlur={updateDate} onTextChange={handleTextChange} onKeyPress={handleKeyPress}
            />
            <MaterialIcons name="access-time" size={16} color={Colors.primary} style={{ marginLeft: 6 }} />
          </View>
        )}

        {showTime && showDate && <View style={styles.divider} />}

        {showDate && (
          <View style={styles.group}>
            <InputField 
              val={dd} setter={setDd} refObj={dRef} next={moRef} prev={showTime ? mRef : undefined} placeholder="DD" len={2} 
              onBlur={updateDate} onTextChange={handleTextChange} onKeyPress={handleKeyPress}
            />
            <Text style={styles.separator}>/</Text>
            <InputField 
              val={MM} setter={setMM} refObj={moRef} next={yRef} prev={dRef} placeholder="MM" len={2} 
              onBlur={updateDate} onTextChange={handleTextChange} onKeyPress={handleKeyPress}
            />
            <Text style={styles.separator}>/</Text>
            <InputField 
              val={yyyy} setter={setYyyy} refObj={yRef} prev={moRef} placeholder="YYYY" len={4} 
              onBlur={updateDate} onTextChange={handleTextChange} onKeyPress={handleKeyPress}
            />
            <MaterialIcons name="calendar-today" size={16} color={Colors.primary} style={{ marginLeft: 6 }} />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontFamily: FontFamily.interSemiBold, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, marginBottom: 8 },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.surfaceContainerLow, 
    borderRadius: Radius.lg, 
    paddingHorizontal: 12, 
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  inputError: { borderColor: Colors.error },
  group: { flexDirection: 'row', alignItems: 'center' },
  divider: { width: 1, height: 20, backgroundColor: Colors.outlineVariant, marginHorizontal: 10 },
  segmentInput: { 
    width: 32, 
    paddingVertical: 8, 
    fontFamily: FontFamily.interBold, 
    fontSize: FontSize.bodyMd, 
    color: Colors.onSurface, 
    textAlign: 'center',
    backgroundColor: 'rgba(0, 91, 191, 0.05)',
    borderRadius: Radius.sm,
    marginHorizontal: 1
  },
  yearInput: { width: 54 },
  separator: { fontFamily: FontFamily.interRegular, fontSize: FontSize.bodyMd, color: Colors.outline, marginHorizontal: 2 },
});
