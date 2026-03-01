import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const HelpItem = ({ title, detail }) => (
  <View style={styles.helpItem}>
    <Text style={styles.helpTitle}>{title}</Text>
    <Text style={styles.helpDetail}>{detail}</Text>
  </View>
);

export default function HelpScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ช่วยเหลือและคำแนะนำ</Text>
      </View>

      <View style={styles.content}>
        <HelpItem 
          title="💊 จะเพิ่มยาใหม่ได้อย่างไร?" 
          detail="ไปที่เมนู 'คลังยา' แล้วกดปุ่มเครื่องหมายบวก (+) คุณสามารถถ่ายรูปซองยาและตั้งเวลาเตือนได้ตามต้องการ" 
        />
        <HelpItem 
          title="👥 ให้ลูกหลานช่วยดูอาการได้อย่างไร?" 
          detail="เข้าหน้า 'โปรไฟล์' > 'จัดการผู้ดูแล' แล้วให้ผู้ดูแลใช้แอปสแกน QR Code ที่ปรากฏบนหน้าจอของคุณ" 
        />
        <HelpItem 
          title="⚠️ ทำไมแอปแจ้งเตือนว่ายาใกล้หมด?" 
          detail="ระบบจะคำนวณจำนวนยาอัตโนมัติทุกครั้งที่คุณกด 'ทานแล้ว' หากยาเหลือเท่ากับเกณฑ์ที่คุณตั้งไว้ แอปจะแจ้งเตือนให้เติมยา" 
        />
        <HelpItem 
          title="📄 ส่งประวัติให้หมอดูทำอย่างไร?" 
          detail="เข้าเมนู 'ประวัติ' แล้วกดไอคอนเอกสารมุมขวาบน ระบบจะสร้างไฟล์ PDF ที่คุณสามารถส่งผ่าน LINE หรือแอปอื่นได้ทันที" 
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 15 },
  content: { padding: 20 },
  helpItem: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 1 },
  helpTitle: { fontSize: 16, fontWeight: 'bold', color: '#0056b3', marginBottom: 8 },
  helpDetail: { fontSize: 14, color: '#555', lineHeight: 20 }
});