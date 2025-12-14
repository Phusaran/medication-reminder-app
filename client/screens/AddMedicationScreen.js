import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Image, ActivityIndicator, Modal } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../constants/config';

export default function AddMedicationScreen({ route, navigation }) {
  const { user } = route.params;
  const prefilledData = route.params?.prefilledData;

  const [name, setName] = useState('');
  const [diseaseGroup, setDiseaseGroup] = useState('');
  const [drugType, setDrugType] = useState('tablet'); 
  const [instruction, setInstruction] = useState('');
  
  // ✅ 1. เพิ่ม State สำหรับจำนวนที่ทานต่อครั้ง
  const [dosageAmount, setDosageAmount] = useState('1'); 
  const [unit, setUnit] = useState('เม็ด');

  const [quantity, setQuantity] = useState('30'); // สต็อกคงเหลือ
  const [notifyThreshold, setNotifyThreshold] = useState('5'); 
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [existingGroups, setExistingGroups] = useState([]);

  // Time & Schedule Vars
  const [intakeTiming, setIntakeTiming] = useState('after_meal'); 
  const [durationMode, setDurationMode] = useState('days'); 
  const [durationDays, setDurationDays] = useState('7'); 
  const [endDate, setEndDate] = useState(new Date()); 
  
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  const [scheduleType, setScheduleType] = useState('specific'); 
  const [timeList, setTimeList] = useState([{ id: Date.now().toString(), date: new Date().setHours(8, 0, 0, 0) }]); 
  const [startTime, setStartTime] = useState(new Date().setHours(8, 0, 0, 0));
  const [intervalHours, setIntervalHours] = useState('4');
  
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentEditingId, setCurrentEditingId] = useState(null); 
  const [tempDate, setTempDate] = useState(new Date());

  useEffect(() => {
      if (prefilledData) {
          setName(prefilledData.name);
          setInstruction(prefilledData.instruction);
          setUnit(prefilledData.unit);
          setImage(prefilledData.image);
      }
  }, [prefilledData]);

  useEffect(() => {
      axios.get(`${API_URL}/disease-groups/${user.id}`)
          .then(res => setExistingGroups(res.data))
          .catch(err => console.log(err));
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('ขออภัย', 'ต้องการสิทธิ์เข้าถึงรูปภาพ');
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaType.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const calculateDates = () => {
    const start = new Date(); let end = new Date();
    if (durationMode === 'days') { const days = parseInt(durationDays) || 0; end.setDate(start.getDate() + days); } else { end = endDate; }
    return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
  };
  
  const getIntakeText = (key) => { const map = { 'before_meal': 'ก่อนอาหาร', 'after_meal': 'หลังอาหาร', 'bedtime': 'ก่อนนอน', 'empty_stomach': 'ท้องว่าง', 'as_needed': 'ตามอาการ' }; return map[key] || ''; };
  const getDrugTypeText = (key) => { const map = { 'tablet': 'เม็ด', 'capsule': 'แคปซูล', 'liquid': 'ยาน้ำ', 'injection': 'ยาฉีด', 'external': 'ภายนอก', 'spray': 'ยาพ่น', 'powder': 'ยาผง', 'other': 'อื่นๆ' }; return map[key] || key; };

  // --- Time Picker Logic ---
  const openTimePicker = (id = null, initialDateTimestamp) => { 
      setCurrentEditingId(id); 
      setTempDate(new Date(initialDateTimestamp)); 
      setShowTimePicker(true); 
  };

  const onTimeSelectedAndroid = (event, selectedDate) => { 
      setShowTimePicker(false);
      if (selectedDate) handleTimeConfirm(selectedDate); 
  };

  const handleTimeConfirm = (selectedDate) => { 
      const timestamp = selectedDate.getTime(); 
      if (scheduleType === 'specific') { 
          setTimeList(prev => prev.map(item => item.id === currentEditingId ? { ...item, date: timestamp } : item)); 
      } else { 
          setStartTime(timestamp); 
      } 
  };

  const confirmIOSTime = () => {
      handleTimeConfirm(tempDate);
      setShowTimePicker(false);
  };

  // --- Date Picker Logic ---
  const onDateSelectedAndroid = (event, selectedDate) => {
      setShowEndDatePicker(false);
      if (selectedDate) setEndDate(selectedDate);
  };

  const confirmIOSDate = () => {
      setShowEndDatePicker(false);
  };

  const addTimeRow = () => { const newId = Date.now().toString() + Math.random().toString().substr(2, 5); const lastTime = timeList.length > 0 ? timeList[timeList.length - 1].date : new Date().setHours(8,0,0,0); const nextTime = new Date(lastTime); nextTime.setHours(nextTime.getHours() + 4); setTimeList(prev => [...prev, { id: newId, date: nextTime.getTime() }]); };
  const removeTimeRow = (id) => { setTimeList(prev => prev.filter(item => item.id !== id)); };
  const formatTime = (timestamp) => { const d = new Date(timestamp); return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`; };
  const generateFinalTimeStrings = () => { if (scheduleType === 'specific') return timeList.map(t => formatTime(t.date) + ":00"); const times = []; const start = new Date(startTime); const interval = parseInt(intervalHours) || 4; let current = new Date(start); const endOfDay = new Date(start); endOfDay.setHours(23, 59, 59, 999); if (interval <= 0) return [formatTime(startTime) + ":00"]; while (current <= endOfDay) { times.push(formatTime(current) + ":00"); current.setHours(current.getHours() + interval); } return times; };

  const scheduleNotifications = async (medName, timeStrings) => { 
      for (const timeStr of timeStrings) { 
          const [hours, minutes] = timeStr.split(':').map(Number); 
          // เพิ่มหน่วยเข้าไปในข้อความแจ้งเตือนด้วย
          await Notifications.scheduleNotificationAsync({ 
              content: { 
                  title: "⏰ ได้เวลาทานยาแล้ว!", 
                  body: `อย่าลืมทานยา: ${medName} (${dosageAmount} ${unit} - ${getIntakeText(intakeTiming)})`, 
                  sound: true,
                  vibrate: [0, 250, 250, 250]
              }, 
              trigger: { 
                  type: Notifications.SchedulableTriggerInputTypes.CALENDAR, 
                  hour: hours, 
                  minute: minutes, 
                  repeats: true 
              } 
          }); 
      } 
  };

  const handleSave = async () => {
    if (!name) return Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อยา');
    setLoading(true);
    try {
        let imageUrl = image;
        if (image && !image.startsWith('http')) {
            const formData = new FormData();
            formData.append('profileImage', { uri: image, name: 'med.jpg', type: 'image/jpeg' });
            const uploadRes = await axios.post(`${API_URL}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (uploadRes.status === 200) imageUrl = uploadRes.data.url;
        }

        const { startDate, endDate: finalEndDate } = calculateDates();
        const timeStrings = generateFinalTimeStrings(); 

        const payload = {
            user_id: user.id,
            custom_name: name,
            instruction: instruction || getIntakeText(intakeTiming),
            dosage_unit: unit,
            image_url: imageUrl,
            initial_quantity: parseInt(quantity),
            notify_threshold: parseInt(notifyThreshold) || 5,
            days_of_week: 'Everyday',
            // ✅✅✅ ส่งค่าจำนวนที่ทาน (เช่น 2) ไปบันทึก
            dosage_amount: dosageAmount || 1, 
            intake_timing: intakeTiming,
            start_date: startDate,
            end_date: finalEndDate,
            times: timeStrings,
            disease_group: diseaseGroup || 'ทั่วไป',
            drug_type: drugType 
        };

        await axios.post(`${API_URL}/medications`, payload);
        await scheduleNotifications(name, timeStrings);
        
        Alert.alert("สำเร็จ", "เพิ่มยาเรียบร้อย!", [
            { 
                text: "ตกลง", 
                onPress: () => navigation.navigate('Home', { user: user }) 
            }
        ]);

    } catch (error) { console.log(error); Alert.alert("ผิดพลาด", "บันทึกไม่สำเร็จ"); } 
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={28} color="#333" /></TouchableOpacity>
        <Text style={styles.headerTitle}>เพิ่มยาใหม่</Text>
        <View style={{width: 28}} /> 
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.imageContainer}>
            <TouchableOpacity onPress={pickImage} style={styles.imageWrapper}>
                {image ? <Image source={{ uri: image }} style={styles.medImage} /> : (
                    <View style={styles.placeholderImage}><Ionicons name="camera" size={40} color="#0056b3" /><Text style={{color: '#0056b3'}}>เพิ่มรูปยา</Text></View>
                )}
            </TouchableOpacity>
        </View>

        <Text style={styles.label}>ชื่อยา</Text>
        <TextInput style={styles.input} placeholder="เช่น พาราเซตามอล" value={name} onChangeText={setName} />

        <Text style={styles.label}>กลุ่มโรค / อาการ</Text>
        <View style={styles.diseaseContainer}>
            <TextInput style={[styles.input, {marginBottom: 10}]} placeholder="พิมพ์ชื่อกลุ่มโรค หรือเลือกด้านล่าง" value={diseaseGroup} onChangeText={setDiseaseGroup} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {existingGroups.map((group, index) => (
                    <TouchableOpacity key={index} style={[styles.chip, diseaseGroup === group && styles.chipActive]} onPress={() => setDiseaseGroup(group)}>
                        <Text style={[styles.chipText, diseaseGroup === group && styles.chipTextActive]}>{group}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>

        <Text style={styles.label}>ประเภทของยา</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {['tablet', 'capsule', 'liquid', 'injection', 'external', 'spray', 'powder', 'other'].map((type) => (
                <TouchableOpacity 
                    key={type} 
                    style={[styles.chip, drugType === type && styles.chipActive]} 
                    onPress={() => {
                        setDrugType(type);
                        if (type === 'tablet') setUnit('เม็ด');
                        else if (type === 'capsule') setUnit('แคปซูล');
                        else if (type === 'liquid') setUnit('มล.');
                        else if (type === 'injection') setUnit('เข็ม');
                    }}
                >
                    <Text style={[styles.chipText, drugType === type && styles.chipTextActive]}>{getDrugTypeText(type)}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>

        <Text style={styles.label}>คำแนะนำ</Text>
        <TextInput style={styles.input} placeholder="เช่น เคี้ยวให้ละเอียด" value={instruction} onChangeText={setInstruction} />

        <Text style={styles.label}>ช่วงเวลาที่ทาน</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {['before_meal', 'after_meal', 'bedtime', 'empty_stomach', 'as_needed'].map((type) => (
                <TouchableOpacity key={type} style={[styles.chip, intakeTiming === type && styles.chipActive]} onPress={() => setIntakeTiming(type)}>
                    <Text style={[styles.chipText, intakeTiming === type && styles.chipTextActive]}>{getIntakeText(type)}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>

        <Text style={[styles.sectionHeader, {marginTop: 20}]}>ตั้งเวลาแจ้งเตือน</Text>
        <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.tab, scheduleType === 'specific' && styles.tabActive]} onPress={() => setScheduleType('specific')}>
                <Text style={scheduleType === 'specific' ? styles.tabTextActive : styles.tabText}>ระบุเวลาเอง</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, scheduleType === 'interval' && styles.tabActive]} onPress={() => setScheduleType('interval')}>
                <Text style={scheduleType === 'interval' ? styles.tabTextActive : styles.tabText}>ทุกๆ X ชั่วโมง</Text>
            </TouchableOpacity>
        </View>

        {scheduleType === 'specific' ? (
            <View>
                {timeList.map((item, index) => (
                    <View key={item.id} style={styles.timeRow}>
                        <Text style={{width: 30}}>{index + 1}.</Text>
                        <TouchableOpacity style={styles.timeInput} onPress={() => openTimePicker(item.id, item.date)}>
                            <Text style={styles.inputText}>{formatTime(item.date)} น.</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeTimeRow(item.id)} style={styles.removeBtn}><Ionicons name="trash-outline" size={24} color="red" /></TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity style={styles.addTimeBtn} onPress={addTimeRow}><Text style={{color: '#0056b3'}}>+ เพิ่มเวลา</Text></TouchableOpacity>
            </View>
        ) : (
            <View style={styles.intervalBox}>
                <View style={styles.row}>
                    <View style={{flex:1}}><Text>เริ่มทาน</Text><TouchableOpacity style={styles.timeInput} onPress={() => openTimePicker(null, startTime)}><Text>{formatTime(startTime)}</Text></TouchableOpacity></View>
                    <View style={{flex:1}}><Text>ทุกๆ (ชม.)</Text><TextInput style={styles.input} keyboardType="numeric" value={intervalHours} onChangeText={setIntervalHours} /></View>
                </View>
            </View>
        )}

        <View style={styles.divider} />
        
        {/* ✅✅✅ ส่วนที่เพิ่มใหม่: ข้อมูลปริมาณการทาน และ สต็อก ✅✅✅ */}
        <View style={styles.row}>
            <View style={{flex: 1, marginRight: 10}}>
                <Text style={styles.label}>ทานครั้งละ (Dosage)</Text>
                <TextInput 
                    style={[styles.input, {textAlign: 'center', fontWeight: 'bold'}]} 
                    value={dosageAmount} 
                    keyboardType="numeric" 
                    onChangeText={setDosageAmount} 
                    placeholder="1"
                />
            </View>
            <View style={{flex: 1}}>
                <Text style={styles.label}>หน่วยนับ</Text>
                <TextInput style={styles.input} value={unit} onChangeText={setUnit} />
            </View>
        </View>

        <View style={styles.row}>
            <View style={{flex: 1, marginRight: 10}}>
                <Text style={styles.label}>จำนวนในคลัง (Stock)</Text>
                <TextInput style={styles.input} value={quantity} keyboardType="numeric" onChangeText={setQuantity} placeholder="จำนวนทั้งหมด" />
            </View>
            <View style={{flex: 1}}>
                <Text style={styles.label}>เตือนเมื่อต่ำกว่า</Text>
                <TextInput style={styles.input} value={notifyThreshold} keyboardType="numeric" onChangeText={setNotifyThreshold} placeholder="เช่น 5" />
            </View>
        </View>
        {/* ========================================================= */}

        <Text style={[styles.label, {marginTop: 10}]}>ระยะเวลาทานยา</Text>
        <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.tab, durationMode === 'days' && styles.tabActive]} onPress={() => setDurationMode('days')}><Text>ระบุวัน</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.tab, durationMode === 'date' && styles.tabActive]} onPress={() => setDurationMode('date')}><Text>ถึงวันที่</Text></TouchableOpacity>
        </View>
        
        {durationMode === 'days' ? (
            <TextInput style={styles.input} keyboardType="numeric" value={durationDays} onChangeText={setDurationDays} placeholder="จำนวนวัน" />
        ) : (
            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowEndDatePicker(true)}>
                <Text style={styles.inputText}>{endDate.toLocaleDateString('th-TH')}</Text>
            </TouchableOpacity>
        )}

        {/* MODALs สำหรับ iOS */}
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
                <DateTimePicker value={tempDate} mode="time" display="default" is24Hour={true} onChange={onTimeSelectedAndroid} />
            )
        )}

        {showEndDatePicker && (
            Platform.OS === 'ios' ? (
                <Modal transparent={true} animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                                    <Text style={{color: 'red', fontSize: 16}}>ยกเลิก</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={confirmIOSDate}>
                                    <Text style={{color: '#0056b3', fontSize: 16, fontWeight: 'bold'}}>ตกลง</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker value={endDate} mode="date" display="spinner" onChange={(e, d) => setEndDate(d || endDate)} style={{height: 200}} />
                        </View>
                    </View>
                </Modal>
            ) : (
                <DateTimePicker value={endDate} mode="date" onChange={onDateSelectedAndroid} />
            )
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>บันทึกข้อมูล</Text>}
        </TouchableOpacity>
        <View style={{height: 50}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#fff', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  content: { padding: 20 },
  label: { fontSize: 16, marginBottom: 8, color: '#333', fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 15, backgroundColor: '#fafafa', color: '#333' },
  inputText: { color: '#333', fontSize: 16 },
  imageContainer: { alignItems: 'center', marginBottom: 20 },
  imageWrapper: { width: 120, height: 120, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#ddd' },
  medImage: { width: '100%', height: '100%' },
  placeholderImage: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f5ff' },
  diseaseContainer: { marginBottom: 15 },
  chipScroll: { marginBottom: 15 },
  chip: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', marginRight: 10, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#e3f2fd', borderColor: '#0056b3' },
  chipText: { color: '#666' },
  chipTextActive: { color: '#0056b3', fontWeight: 'bold' },
  tabContainer: { flexDirection: 'row', marginBottom: 15, backgroundColor: '#f0f0f0', borderRadius: 10, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: '#fff', elevation: 2 },
  tabText: { color: '#666' },
  tabTextActive: { color: '#0056b3', fontWeight: 'bold' },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  timeInput: { flex: 1, padding: 12, backgroundColor: '#fafafa', borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  addTimeBtn: { alignItems: 'center', padding: 10, borderStyle: 'dashed', borderWidth: 1, borderColor: '#0056b3', borderRadius: 10, marginTop: 5 },
  intervalBox: { padding: 15, backgroundColor: '#f5f5f5', borderRadius: 10 },
  datePickerBtn: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, backgroundColor: '#fafafa' },
  saveBtn: { backgroundColor: '#0056b3', padding: 15, borderRadius: 30, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#0056b3' },
  removeBtn: { marginLeft: 10, padding: 5 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalContent: { backgroundColor: '#727272ff', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, paddingHorizontal: 10 }
});