import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { Colors, FontFamily } from '../../theme';
import { MaterialIcons } from '@expo/vector-icons';

interface CustomPickerProps {
  value: string;
  options: string[];
  onSelect: (val: string) => void;
  placeholder?: string;
  label?: string;
}

export const PickerOption = ({ 
  label, 
  selected, 
  onPress 
}: { 
  label: string; 
  selected: boolean; 
  onPress: () => void 
}) => (
  <TouchableOpacity
    style={[styles.pickerChip, selected && styles.pickerChipActive]}
    onPress={onPress}
  >
    <Text style={[styles.pickerChipText, selected && styles.pickerChipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

export const CustomPicker: React.FC<CustomPickerProps> = ({
  value,
  options,
  onSelect,
  placeholder = 'Chọn...',
  label,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity 
        style={styles.trigger} 
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.valueText, !value && styles.placeholderText]}>
          {value || placeholder}
        </Text>
        <MaterialIcons name="expand-more" size={24} color={Colors.outline} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={() => setVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || 'Chọn tùy chọn'}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.outline} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    onSelect(item);
                    setVisible(false);
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    value === item && styles.optionTextActive
                  ]}>
                    {item}
                  </Text>
                  {value === item && (
                    <MaterialIcons name="check" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  label: {
    fontFamily: FontFamily.interMedium,
    fontSize: 13,
    color: Colors.outline,
    marginBottom: 8,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderColor: '#E8F1FF',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  valueText: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: 15,
    color: Colors.onSurface,
  },
  placeholderText: {
    color: Colors.outline,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: FontFamily.manropeBold,
    fontSize: 20,
    color: Colors.onSurface,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  optionText: {
    fontFamily: FontFamily.interMedium,
    fontSize: 15,
    color: Colors.onSurface,
  },
  optionTextActive: {
    color: Colors.primary,
    fontFamily: FontFamily.interBold,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.surfaceContainer,
  },
  pickerChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pickerChipActive: {
    backgroundColor: '#E8F1FF',
    borderColor: Colors.primary,
  },
  pickerChipText: {
    fontFamily: FontFamily.interMedium,
    fontSize: 13,
    color: Colors.outline,
  },
  pickerChipTextActive: {
    color: Colors.primary,
    fontFamily: FontFamily.interSemiBold,
  },
});
