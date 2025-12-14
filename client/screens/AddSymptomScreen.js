import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

// ⚠️ เช็ค IP ให้ตรงกับเครื่องคุณ (192.168.0.31)
const API_URL = 'http://192.168.0.31:3000/api/symptoms';

export default function AddSymptomScreen({ route, navigation }) {
  // รับข้อมูล user ที่ส่งมาจากหน้า Home
  const user = route.params?.user || { id: 0 };

  const [symptomName, setSymptomName] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState(1); // ค่าเริ่มต้นระดับ 1

  const handleSave = async () => {
    // ตรวจสอบว่ากรอกชื่ออาการหรือยัง
    if (!symptomName) {
      Alert.alert('แจ้งเตือน', 'กรุณาระบุชื่ออาการ');
      return;
    }

    try {
      // ส่งข้อมูลไปบันทึกที่ฐานข้อมูล
      const response = await axios.post(API_URL, {
        user_id: user.id,
        symptom_name: symptomName,
        description: description,
        severity: severity
      });

      if (response.status === 201) {
        Alert.alert("สำเร็จ", "บันทึกอาการเรียบร้อยแล้ว");
        navigation.goBack(); // กลับไปหน้าเดิม
      }
    } catch (error) {
      console.log("Save Symptom Error:", error);
      Alert.alert("ผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้");
    }
  };

  // ฟังก์ชันช่วยแสดงผลสีตามระดับความรุนแรง
  const getSeverityColor = (level) => {
    if (level <= 2) return '#4caf50'; // เขียว (เบา)
    if (level === 3) return '#ff9800'; // ส้ม (ปานกลาง)
    return '#f44336'; // แดง (รุนแรง)
  };

  return (
    <View style={styles.container}>
      {/* --- Header --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>บันทึกอาการป่วย</Text>
        <View style={{width: 28}} /> 
      </View>

      <ScrollView style={styles.content}>
        {/* ช่องกรอกชื่ออาการ */}
        <Text style={styles.label}>อาการที่พบ (เช่น ปวดหัว, ตัวร้อน)</Text>
        <TextInput 
          style={styles.input} 
          placeholder="ระบุชื่ออาการ..." 
          value={symptomName}
          onChangeText={setSymptomName}
        />

        {/* ช่องกรอกรายละเอียด */}
        <Text style={styles.label}>รายละเอียดเพิ่มเติม</Text>
        <TextInput 
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
          placeholder="เช่น เป็นมาตั้งแต่เมื่อวาน กินยาแล้วยังไม่ดีขึ้น..." 
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {/* ปุ่มเลือกระดับความรุนแรง 1-5 */}
        <Text style={styles.label}>ระดับความรุนแรง</Text>
        <View style={styles.severityContainer}>
          {[1, 2, 3, 4, 5].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.severityButton,
                severity === level && { 
                    backgroundColor: getSeverityColor(level),
                    borderColor: getSeverityColor(level),
                    elevation: 5 
                }
              ]}
              onPress={() => setSeverity(level)}
            >
              <Text style={[
                styles.severityText, 
                severity === level ? { color: '#fff' } : { color: '#333' }
              ]}>{level}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* คำอธิบายระดับความรุนแรง */}
        <Text style={styles.severityDescription}>
            {severity === 1 ? 'เล็กน้อย (ไม่กระทบชีวิตประจำวัน)' : 
             severity === 2 ? 'ปานกลาง (พอทนได้)' : 
             severity === 3 ? 'เริ่มรุนแรง (รบกวนชีวิตประจำวัน)' :
             severity === 4 ? 'รุนแรง (ควรพบแพทย์)' : 
             'รุนแรงมาก (ฉุกเฉิน)'}
        </Text>

        {/* ปุ่มบันทึก */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>บันทึกอาการ</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  content: { padding: 20 },
  label: { fontSize: 16, marginBottom: 8, color: '#333', fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fafafa'
  },
  
  // Styles สำหรับปุ่มระดับความรุนแรง
  severityContainer: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      marginBottom: 10,
      paddingHorizontal: 10
  },
  severityButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5'
  },
  severityText: { fontSize: 18, fontWeight: 'bold' },
  severityDescription: {
      textAlign: 'center',
      marginBottom: 30,
      color: '#666',
      fontSize: 14
  },
  
  saveBtn: {
      backgroundColor: '#d32f2f', // สีแดงให้ดูแตกต่างจากหน้าเพิ่มยา
      padding: 15,
      borderRadius: 30,
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 40,
      elevation: 3
  },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});