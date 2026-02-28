import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Modal, Image, ActivityIndicator } from 'react-native'; // ✅ เพิ่ม Modal
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../constants/config';
import * as Notifications from 'expo-notifications';

export default function EditMedicationScreen({ route, navigation }) {
  const { medication } = route.params;

  const [name, setName] = useState(medication.custom_name);
  const [instruction, setInstruction] = useState(medication.instruction);
  const [quantity, setQuantity] = useState(medication.current_quantity.toString());
  const [unit, setUnit] = useState(medication.dosage_unit);
  const [image, setImage] = useState(medication.image_url);
  const [loading, setLoading] = useState(false);

  // Time & Date
  const [intakeTiming, setIntakeTiming] = useState(medication.intake_timing || 'after_meal');
  const [endDate, setEndDate] = useState(medication.end_date ? new Date(medication.end_date) : new Date());

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
          const response = await axios.get(`${API_URL}/medications/${medication.user_med_id}`);
          const meds = response.data;
          
          if (Array.isArray(meds) && meds.length > 0) {
             const schedules = meds.map((item, index) => {
                 if (item.time_to_take) {
                    const [h, m] = item.time_to_take.split(':');
                    const d = new Date();
                    d.setHours(h, m, 0, 0);
                    return { id: Date.now() + index, date: d.getTime() };
                 }
                 return null;
             }).filter(item => item !== null);
             
             if (schedules.length > 0) setTimeList(schedules);
          }
      } catch (error) { console.log(error); }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('ขออภัย', 'ต้องการสิทธิ์เข้าถึงรูปภาพ');
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.5,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const formatTime = (timestamp) => {
      const d = new Date(timestamp);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  // --- Picker Logic ---
  const openTimePicker = (id, timestamp) => {
      setCurrentEditingId(id);
      setTempDate(new Date(timestamp));
      setShowTimePicker(true);
  };

  // Android: เลือกปุ๊บปิดปั๊บ
  const onTimeSelectedAndroid = (event, selectedDate) => {
      setShowTimePicker(false);
      if (selectedDate) handleTimeConfirm(selectedDate);
  };

  // iOS: กดตกลงก่อนค่อยปิด
  const confirmIOSTime = () => {
      handleTimeConfirm(tempDate);
      setShowTimePicker(false);
  };

  const handleTimeConfirm = (selectedDate) => {
      setTimeList(prev => prev.map(item => item.id === currentEditingId ? { ...item, date: selectedDate.getTime() } : item));
  };

  const addTimeRow = () => {
      const newId = Date.now() + Math.random();
      const nextTime = new Date().setHours(8,0,0,0);
      setTimeList([...timeList, { id: newId, date: nextTime }]);
  };

  const removeTimeRow = (id) => {
      setTimeList(prev => prev.filter(item => item.id !== id));
  };
// ✅ เพิ่มฟังก์ชันรีเซ็ตการแจ้งเตือน (Sync ให้ตรงกับ Database)
  const resyncNotifications = async () => {
      try {
          // A. ยกเลิกของเก่าทั้งหมดก่อน
          await Notifications.cancelAllScheduledNotificationsAsync();

          // B. ดึงข้อมูลยาที่ยังเปิดใช้งานอยู่มาใหม่ 
          // (หมายเหตุ: ตรวจสอบว่าใน route.params มี userId ส่งมาด้วย หรือใช้ค่าจาก medication.user_id)
          const userId = medication.user_id || route.params?.userId; 
          if (!userId) return;

          const response = await axios.get(`${API_URL}/medications/${userId}`); 
          const activeSchedules = response.data;

          // C. วนลูปตั้งปลุกใหม่ทีละอัน
          for (const item of activeSchedules) {
              if (!item.time_to_take) continue;

              const [hours, minutes] = item.time_to_take.split(':').map(Number);
              if (isNaN(hours) || isNaN(minutes)) continue;

              await Notifications.scheduleNotificationAsync({
                  content: {
                      title: "⏰ ได้เวลาทานยาแล้ว!",
                      body: `อย่าลืมทานยา: ${item.custom_name} (${item.dosage_amount} ${item.dosage_unit})`,
                      sound: true,
                      vibrate: [0, 250, 250, 250],
                      data: { 
                          medName: item.custom_name, 
                          scheduleId: item.schedule_id 
                      }
                  },
                  trigger: { 
                      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                      hour: hours, 
                      minute: minutes, 
                      repeats: true 
                  }
              });
          }
          console.log("Notifications Resynced successfully after edit!");
      } catch (error) {
          console.log("Resync Error:", error);
      }
  };
  const handleUpdate = async () => {
      setLoading(true);
      try {
          let finalImageUrl = image;
          if (image && image.startsWith('file://')) {
              const formData = new FormData();
              formData.append('profileImage', { uri: image, name: 'med.jpg', type: 'image/jpeg' });
              const uploadRes = await axios.post(`${API_URL}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
              finalImageUrl = uploadRes.data.url;
          }

          const timeStrings = timeList.map(t => formatTime(t.date) + ":00");
          
          const toLocalYMD = d => {
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              return `${y}-${m}-${day}`;
          };
          const payload = {
              custom_name: name,
              instruction,
              dosage_unit: unit,
              initial_quantity: parseInt(quantity) || 0,
              notify_threshold: 5,
              image_url: finalImageUrl,
              intake_timing: intakeTiming,
              start_date: toLocalYMD(new Date()),
              end_date: toLocalYMD(endDate),
              times: timeStrings
          };

          await axios.put(`${API_URL}/medications/${medication.user_med_id}`, payload);
          
          await resyncNotifications();
          
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
                    {/* 🔥 แก้สีตัวอักษรเป็น #333 ให้เห็นชัดบนพื้นขาว 🔥 */}
                    <Text style={[styles.timeInputText, {color: '#333'}]}>{formatTime(item.date)} น.</Text>
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

        {/* ✅ Picker Modal สำหรับ iOS */}
        {showTimePicker && (
            Platform.OS === 'ios' ? (
                <Modal transparent={true} animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                                    <Text style={{color: 'red', fontSize: 16}}>ยกเลิก</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={confirmIOSTime}>
                                    <Text style={{color: '#0056b3', fontSize: 16, fontWeight: 'bold'}}>ตกลง</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker 
                                value={tempDate} 
                                mode="time" 
                                display="spinner" 
                                is24Hour={true} 
                                onChange={(e, d) => setTempDate(d || tempDate)} 
                                style={{height: 200}}
                            />
                        </View>
                    </View>
                </Modal>
            ) : (
                <DateTimePicker 
                    value={tempDate} 
                    mode="time" 
                    display="default" 
                    is24Hour={true} 
                    onChange={onTimeSelectedAndroid} 
                />
            )
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
  timeInputText: { fontSize: 16 },
  removeBtn: { marginLeft: 10, padding: 5 },
  addTimeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderStyle: 'dashed', borderWidth: 1, borderColor: '#0056b3', borderRadius: 10 },
  saveBtn: { backgroundColor: '#0056b3', padding: 15, borderRadius: 30, alignItems: 'center', marginTop: 30 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#0056b3' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  
  // ✅ Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalContent: { backgroundColor: '#404142ff', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, paddingHorizontal: 10 }
});