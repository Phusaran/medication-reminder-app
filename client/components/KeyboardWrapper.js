import React from 'react';
import { KeyboardAvoidingView, ScrollView, TouchableWithoutFeedback, Keyboard, Platform } from 'react-native';

export default function KeyboardWrapper({ children, style }) {
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={[{ flex: 1, backgroundColor: '#fff' }, style]}
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }} 
        keyboardShouldPersistTaps="handled" // ทำให้เวลากดปุ่มตอนคีย์บอร์ดเด้งอยู่ ปุ่มทำงานทันที
        showsVerticalScrollIndicator={false}
      >
        {/* แตะพื้นที่ว่างเพื่อซ่อนคีย์บอร์ด */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          {children}
        </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}