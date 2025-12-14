import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Modal, Image, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

// ⚠️ เช็ค IP
const BASE_URL = 'http://192.168.0.31:3000'; 
const API_URL = `${BASE_URL}/api`;

export default function EditMedicationScreen({ route, navigation }) {
  const { medication } = route.params; // รับข้อมูลยาที่ส่งมา

  const [name, setName] = useState(medication.custom_name);
  const [instruction, setInstruction] = useState(medication.instruction);
  const [quantity, setQuantity] = useState(medication.current_quantity.toString());
  const [unit, setUnit] = useState(medication.dosage_unit);
  const [image, setImage] = useState(medication.image_url); // ใช้ image_url (AS alias จาก query)
  const [loading, setLoading] = useState(false);

  // Time & Date
  const [intakeTiming, setIntakeTiming] = useState(medication.intake_timing || 'after_meal');
  const [endDate, setEndDate] = useState(medication.end_date ? new Date(medication.end_date) : new Date());
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Schedule List
  const [timeList, setTimeList] = useState([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentEditingId, setCurrentEditingId] = useState(null);
  const [tempDate, setTempDate] = useState(new Date());

  useEffect(() => {
      fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
      try {
          const response = await axios.get(`${API_URL}/medication/${medication.user_med_id}`);
          const schedules = response.data.map((item, index) => {
              // แปลงเวลา "08:00:00" เป็น Date Object
              const [h, m] = item.time_to_take.split(':');
              const d = new Date();
              d.setHours(h, m, 0, 0);
              return { id: Date.now() + index, date: d.getTime() };
          });
          setTimeList(schedules);
      } catch (error) { console.log(error); }
  };

  // --- Image Picker ---
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('ขออภัย', 'ต้องการสิทธิ์เข้าถึงรูปภาพ');
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.5,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // --- Time Management ---
  const formatTime = (timestamp) => {
      const d = new Date(timestamp);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const openTimePicker = (id, timestamp) => {
      setCurrentEditingId(id);
      setTempDate(new Date(timestamp));
      setShowTimePicker(true);
  };

  const handleTimeConfirm = (selectedDate) => {
      if (Platform.OS === 'android') setShowTimePicker(false);
      if (selectedDate) {
          setTimeList(prev => prev.map(item => item.id === currentEditingId ? { ...item, date: selectedDate.getTime() } : item));
      }
      if (Platform.OS === 'ios') setShowTimePicker(false);
  };

  const addTimeRow = () => {
      const newId = Date.now() + Math.random();
      const nextTime = new Date().setHours(8,0,0,0);
      setTimeList([...timeList, { id: newId, date: nextTime }]);
  };

  const removeTimeRow = (id) => {
      setTimeList(prev => prev.filter(item => item.id !== id));
  };

  // --- Save Update ---
  const handleUpdate = async () => {
      setLoading(true);
      try {
          let finalImageUrl = image;
          // ถ้าเป็นรูปใหม่ (Local URI) ให้อัปโหลดก่อน
          if (image && image.startsWith('file://')) {
              const formData = new FormData();
              formData.append('profileImage', { uri: image, name: 'med.jpg', type: 'image/jpeg' });
              const uploadRes = await axios.post(`${API_URL}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
              finalImageUrl = uploadRes.data.url;
          }

          const timeStrings = timeList.map(t => formatTime(t.date) + ":00");
          
          const payload = {
              custom_name: name,
              instruction,
              dosage_unit: unit,
              initial_quantity: parseInt(quantity),
              notify_threshold: 5,
              image_url: finalImageUrl,
              intake_timing: intakeTiming,
              start_date: new Date().toISOString().split('T')[0], // วันที่เริ่มแก้ยากหน่อย เอาเป็นวันปัจจุบันหรือวันเดิม
              end_date: endDate.toISOString().split('T')[0],
              times: timeStrings
          };

          await axios.put(`${API_URL}/medications/${medication.user_med_id}`, payload);
          Alert.alert('สำเร็จ', 'แก้ไขข้อมูลเรียบร้อย', [
              { text: 'ตกลง', onPress: () => navigation.goBack() }
          ]);

      } catch (error) {
          console.log(error);
          Alert.alert('ผิดพลาด', 'ไม่สามารถแก้ไขข้อมูลได้');
      } finally {
          setLoading(false);
      }
  };

  const handleDelete = () => {
      Alert.alert('ยืนยันลบ', 'คุณแน่ใจหรือไม่ที่จะลบยานี้? ข้อมูลประวัติการทานจะหายไปด้วย', [
          { text: 'ยกเลิก', style: 'cancel' },
          { 
              text: 'ลบ', 
              style: 'destructive', 
              onPress: async () => {
                  try {
                      await axios.delete(`${API_URL}/medications/${medication.user_med_id}`);
                      navigation.goBack();
                  } catch (error) { Alert.alert('ผิดพลาด', 'ลบข้อมูลไม่สำเร็จ'); }
              }
          }
      ]);
  };

  const getIntakeText = (key) => {
    const map = { 'before_meal': 'ก่อนอาหาร', 'after_meal': 'หลังอาหาร', 'bedtime': 'ก่อนนอน', 'empty_stomach': 'ท้องว่าง', 'as_needed': 'ตามอาการ' };
    return map[key] || '';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={28} color="#333" /></TouchableOpacity>
        <Text style={styles.headerTitle}>แก้ไขข้อมูลยา</Text>
        <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color="#f44336" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* รูปภาพ */}
        <View style={styles.imageContainer}>
            <TouchableOpacity onPress={pickImage} style={styles.imageWrapper}>
                {image ? <Image source={{ uri: image }} style={styles.medImage} /> : (
                    <View style={styles.placeholderImage}><Ionicons name="camera" size={40} color="#0056b3" /></View>
                )}
            </TouchableOpacity>
        </View>

        <Text style={styles.label}>ชื่อยา</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />

        <Text style={styles.label}>คำแนะนำ</Text>
        <TextInput style={styles.input} value={instruction} onChangeText={setInstruction} />

        {/* ช่วงเวลาทาน */}
        <Text style={styles.label}>ช่วงเวลาที่ทาน</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
            {['before_meal', 'after_meal', 'bedtime', 'empty_stomach', 'as_needed'].map((type) => (
                <TouchableOpacity key={type} style={[styles.chip, intakeTiming === type && styles.chipActive]} onPress={() => setIntakeTiming(type)}>
                    <Text style={[styles.chipText, intakeTiming === type && styles.chipTextActive]}>{getIntakeText(type)}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>

        {/* เวลาแจ้งเตือน */}
        <Text style={styles.sectionHeader}>เวลาแจ้งเตือน</Text>
        {timeList.map((item, index) => (
            <View key={item.id} style={styles.timeRow}>
                <Text style={{fontSize: 16, width: 30, fontWeight: 'bold', color: '#666'}}>{index + 1}.</Text>
                <TouchableOpacity style={styles.timeInput} onPress={() => openTimePicker(item.id, item.date)}>
                    <Text style={styles.timeInputText}>{formatTime(item.date)} น.</Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeTimeRow(item.id)} style={styles.removeBtn}>
                    <Ionicons name="trash-outline" size={24} color="#f44336" />
                </TouchableOpacity>
            </View>
        ))}
        <TouchableOpacity style={styles.addTimeBtn} onPress={addTimeRow}>
            <Ionicons name="add-circle" size={24} color="#0056b3" />
            <Text style={{color: '#0056b3', fontWeight: 'bold', marginLeft: 5}}>เพิ่มเวลา</Text>
        </TouchableOpacity>

        {/* จำนวน */}
        <View style={[styles.row, {marginTop: 20}]}>
            <View style={{flex: 1, marginRight: 10}}>
                <Text style={styles.label}>จำนวนคงเหลือ</Text>
                <TextInput style={styles.input} value={quantity} keyboardType="numeric" onChangeText={setQuantity} />
            </View>
            <View style={{flex: 1}}>
                <Text style={styles.label}>หน่วยนับ</Text>
                <TextInput style={styles.input} value={unit} onChangeText={setUnit} />
            </View>
        </View>

        {/* Picker Modal */}
        {showTimePicker && (
            <DateTimePicker value={tempDate} mode="time" display="default" is24Hour={true} onChange={(e, d) => handleTimeConfirm(d)} />
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>บันทึกการเปลี่ยนแปลง</Text>}
        </TouchableOpacity>
        <View style={{height: 50}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#fff', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  content: { padding: 20 },
  label: { fontSize: 16, marginBottom: 8, color: '#333', fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 15, backgroundColor: '#fafafa' },
  imageContainer: { alignItems: 'center', marginBottom: 20 },
  imageWrapper: { width: 120, height: 120, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#ddd' },
  medImage: { width: '100%', height: '100%' },
  placeholderImage: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f5ff' },
  chip: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', marginRight: 10, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#e3f2fd', borderColor: '#0056b3' },
  chipText: { color: '#666' },
  chipTextActive: { color: '#0056b3', fontWeight: 'bold' },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  timeInput: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#fafafa', borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  timeInputText: { fontSize: 16, color: '#333' },
  removeBtn: { marginLeft: 10, padding: 5 },
  addTimeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderStyle: 'dashed', borderWidth: 1, borderColor: '#0056b3', borderRadius: 10 },
  saveBtn: { backgroundColor: '#0056b3', padding: 15, borderRadius: 30, alignItems: 'center', marginTop: 30 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#0056b3' },
  row: { flexDirection: 'row', justifyContent: 'space-between' }
});