import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { Colors, FontFamily, FontSize } from '../../theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export const MultiActionFAB = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigation = useNavigation<any>();

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const handleAddEvent = () => {
    setIsOpen(false);
    navigation.navigate('AddTask', { type: 'event' });
  };

  const handleAddTask = () => {
    setIsOpen(false);
    navigation.navigate('AddTask', { type: 'task' });
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={() => setIsOpen(false)}
        />
      )}

      {/* Action Buttons */}
      {isOpen && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionItem} onPress={handleAddEvent}>
            <Text style={styles.actionText}>Thêm Sự Kiện</Text>
            <View style={[styles.actionIconBtn, { backgroundColor: Colors.tertiaryContainer || '#c55500' }]}>
              <MaterialIcons name="event" size={24} color={Colors.onTertiary || '#fff'} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleAddTask}>
            <Text style={styles.actionText}>Thêm Công Việc</Text>
            <View style={[styles.actionIconBtn, { backgroundColor: Colors.primary }]}>
              <MaterialIcons name="fact-check" size={24} color={Colors.onPrimary} />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Main FAB */}
      <TouchableOpacity 
        style={[styles.fab, isOpen && styles.fabOpen]} 
        activeOpacity={0.8}
        onPress={toggleOpen}
      >
        <MaterialIcons 
          name={isOpen ? "close" : "add"} 
          size={32} 
          color="#ffffff" 
        />
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 90,
  },
  fab: {
    position: 'absolute',
    bottom: 90, // Above bottom tab bar
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: Colors.primary || '#005bbf',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary || '#005bbf',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 100,
  },
  fabOpen: {
    backgroundColor: Colors.error || '#ba1a1a', // Red background when open to indicate close
    shadowColor: Colors.error || '#ba1a1a',
    transform: [{ rotate: '180deg' }],
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 164, // 90 + 64 + 10
    right: 24,
    alignItems: 'flex-end',
    zIndex: 100,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionText: {
    fontFamily: FontFamily.manropeBold,
    fontSize: FontSize.bodyLg,
    color: '#333',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  actionIconBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  }
});
