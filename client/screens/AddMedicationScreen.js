import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Image, ActivityIndicator, Modal } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../constants/config';
import KeyboardWrapper from '../components/KeyboardWrapper';

export default function AddMedicationScreen({ route, navigation }) {
    const { user } = route.params;
    const prefilledData = route.params?.prefilledData;

    const [name, setName] = useState('');
    const [tradeName, setTradeName] = useState('');
    const [mg, setMg] = useState('');
    const [diseaseGroup, setDiseaseGroup] = useState('');
    const [drugType, setDrugType] = useState('tablet');
    const [instruction, setInstruction] = useState('');
    const [dosageAmount, setDosageAmount] = useState('1');
    const [unit, setUnit] = useState('เม็ด');
    const [quantity, setQuantity] = useState('30');
    const [notifyThreshold, setNotifyThreshold] = useState('5');
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [existingGroups, setExistingGroups] = useState([]);

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

    // ❇️ แก้ไขบั๊กจุดนี้: แมปข้อมูลจากคลังยาหลัก (Medication_Master) เข้าสู่ State ให้ถูกต้อง
    useEffect(() => {
        if (prefilledData) {
            setName(prefilledData.generic_name || prefilledData.name || '');
            setTradeName(prefilledData.trade_name || prefilledData.tradeName || '');
            setMg(prefilledData.mg ? String(prefilledData.mg) : '');
            setInstruction(prefilledData.description || prefilledData.instruction || '');
            setUnit(prefilledData.dosage_unit || prefilledData.unit || 'เม็ด');
            setImage(prefilledData.image_url || prefilledData.image || null);
            setDiseaseGroup(prefilledData.default_disease_group || '');
            if (prefilledData.drug_type) {
                setDrugType(prefilledData.drug_type);
            }
        }

        axios.get(`${API_URL}/disease-groups/${user.id || user.user_id}`)
            .then(res => setExistingGroups(res.data))
            .catch(err => console.log(err));
    }, [prefilledData]);

    const pickImage = async () => {
        try {
            if (Platform.OS !== 'web') {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') return Alert.alert('ขออภัย', 'แอปต้องการสิทธิ์เข้าถึงแกลลอรี่');
            }
            let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5 });
            if (!result.canceled && result.assets) setImage(result.assets[0].uri);
        } catch (error) { console.log(error); }
    };

    const calculateDates = () => {
        const start = new Date();
        let end = new Date();
        if (durationMode === 'days') { end.setDate(start.getDate() + (parseInt(durationDays) || 0)); } else { end = endDate; }
        const toLocalYMD = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return { startDate: toLocalYMD(start), endDate: toLocalYMD(end) };
    };

    const getIntakeText = (key) => ({ 'before_meal': 'ก่อนอาหาร', 'after_meal': 'หลังอาหาร', 'bedtime': 'ก่อนนอน', 'empty_stomach': 'ท้องว่าง', 'as_needed': 'ตามอาการ' }[key] || '');
    const getDrugTypeText = (key) => ({ 'tablet': 'เม็ด', 'capsule': 'แคปซูล', 'liquid': 'ยาน้ำ', 'injection': 'ยาฉีด', 'external': 'ภายนอก', 'spray': 'ยาพ่น', 'powder': 'ยาผง', 'other': 'อื่นๆ' }[key] || key);

    const openTimePicker = (id, initialDate) => { setCurrentEditingId(id); setTempDate(new Date(initialDate)); setShowTimePicker(true); };
    const onTimeSelectedAndroid = (e, d) => { setShowTimePicker(false); if (d) handleTimeConfirm(d); };
    const confirmIOSTime = () => { handleTimeConfirm(tempDate); setShowTimePicker(false); };
    const handleTimeConfirm = (d) => { const t = d.getTime(); if (scheduleType === 'specific') setTimeList(p => p.map(i => i.id === currentEditingId ? { ...i, date: t } : i)); else setStartTime(t); };

    const addTimeRow = () => { const nt = new Date(timeList.length ? timeList[timeList.length - 1].date : new Date().setHours(8, 0, 0, 0)); nt.setHours(nt.getHours() + 4); setTimeList(p => [...p, { id: Date.now().toString(), date: nt.getTime() }]); };
    const removeTimeRow = (id) => setTimeList(p => p.filter(i => i.id !== id));
    const formatTime = (t) => { const d = new Date(t); return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`; };
    const generateFinalTimeStrings = () => { if (scheduleType === 'specific') return timeList.map(t => formatTime(t.date) + ":00"); const times = []; const start = new Date(startTime); const interval = parseInt(intervalHours) || 4; let current = new Date(start); const endOfDay = new Date(start); endOfDay.setHours(23, 59, 59, 999); if (interval <= 0) return [formatTime(startTime) + ":00"]; while (current <= endOfDay) { times.push(formatTime(current) + ":00"); current.setHours(current.getHours() + interval); } return times; };

    const handleSave = async () => {
        if (!name) return Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อยา');
        setLoading(true);
        try {
            let imageUrl = image;
            if (image && !image.startsWith('http')) {
                const formData = new FormData(); formData.append('profileImage', { uri: image, name: 'med.jpg', type: 'image/jpeg' });
                const uploadRes = await axios.post(`${API_URL}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                if (uploadRes.status === 200) imageUrl = uploadRes.data.url;
            }

            const { startDate, endDate: finalEndDate } = calculateDates();
            const timeStrings = generateFinalTimeStrings();

            const payload = {
                user_id: user.id || user.user_id,
                custom_name: name,
                trade_name: tradeName || null,
                mg: mg ? parseInt(mg, 10) : null,
                instruction: instruction || getIntakeText(intakeTiming),
                dosage_unit: unit,
                image_url: imageUrl,
                initial_quantity: parseInt(quantity, 10) || 0,
                notify_threshold: parseInt(notifyThreshold, 10) || 5,
                days_of_week: 'Everyday',
                dosage_amount: parseInt(dosageAmount, 10) || 1,
                intake_timing: intakeTiming,
                start_date: startDate,
                end_date: finalEndDate,
                times: timeStrings,
                disease_group: diseaseGroup || 'ทั่วไป',
                drug_type: drugType
            };

            const saveRes = await axios.post(`${API_URL}/medications`, payload);
            Alert.alert("สำเร็จ", "เพิ่มยาเรียบร้อย!", [{ text: "ตกลง", onPress: () => navigation.navigate('Home', { user: user }) }]);
        } catch (error) { Alert.alert("ผิดพลาด", "บันทึกไม่สำเร็จ"); } finally { setLoading(false); }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={28} color="#333" /></TouchableOpacity>
                <Text style={styles.headerTitle}>เพิ่มยาใหม่</Text>
                <View style={{ width: 28 }} />
            </View>

            <KeyboardWrapper>
                <View style={styles.content}>
                    <View style={styles.imageContainer}>
                        <TouchableOpacity onPress={pickImage} style={styles.imageWrapper}>
                            {image ? <Image source={{ uri: image }} style={styles.medImage} /> : (
                                <View style={styles.placeholderImage}><Ionicons name="camera" size={40} color="#0056b3" /><Text style={{ color: '#0056b3' }}>เพิ่มรูปยา</Text></View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>ชื่อยาสามัญ (Generic Name) *</Text>
                    <TextInput style={styles.input} placeholder="เช่น พาราเซตามอล" value={name} onChangeText={setName} />

                    <Text style={styles.label}>ชื่อทางการค้า (Trade Name)</Text>
                    <TextInput style={styles.input} placeholder="เช่น ซาร่า, ไทลินอล" value={tradeName} onChangeText={setTradeName} />

                    <Text style={styles.label}>ปริมาณยา (mg)</Text>
                    <TextInput style={styles.input} placeholder="เช่น 500" keyboardType="numeric" value={mg} onChangeText={setMg} />

                    <Text style={styles.label}>กลุ่มโรค / อาการ</Text>
                    <View style={styles.diseaseContainer}>
                        <TextInput style={[styles.input, { marginBottom: 10 }]} placeholder="พิมพ์ชื่อกลุ่มโรค หรือเลือกด้านล่าง" value={diseaseGroup} onChangeText={setDiseaseGroup} />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {existingGroups.map((group, idx) => (
                                <TouchableOpacity key={idx} style={[styles.chip, diseaseGroup === group && styles.chipActive]} onPress={() => setDiseaseGroup(group)}>
                                    <Text style={[styles.chipText, diseaseGroup === group && styles.chipTextActive]}>{group}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <Text style={styles.label}>ประเภทของยา</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                        {['tablet', 'capsule', 'liquid', 'injection', 'external', 'spray', 'powder', 'other'].map((type) => (
                            <TouchableOpacity key={type} style={[styles.chip, drugType === type && styles.chipActive]} onPress={() => { setDrugType(type); setUnit({ tablet: 'เม็ด', capsule: 'แคปซูล', liquid: 'มล.', injection: 'เข็ม' }[type] || 'หน่วย'); }}>
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

                    <Text style={[styles.sectionHeader, { marginTop: 20 }]}>ตั้งเวลาแจ้งเตือน</Text>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity style={[styles.tab, scheduleType === 'specific' && styles.tabActive]} onPress={() => setScheduleType('specific')}><Text style={scheduleType === 'specific' ? styles.tabTextActive : styles.tabText}>ระบุเวลาเอง</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.tab, scheduleType === 'interval' && styles.tabActive]} onPress={() => setScheduleType('interval')}><Text style={scheduleType === 'interval' ? styles.tabTextActive : styles.tabText}>ทุกๆ X ชั่วโมง</Text></TouchableOpacity>
                    </View>

                    {scheduleType === 'specific' ? (
                        <View>
                            {timeList.map((item, index) => (
                                <View key={item.id} style={styles.timeRow}>
                                    <Text style={{ width: 30 }}>{index + 1}.</Text>
                                    <TouchableOpacity style={styles.timeInput} onPress={() => openTimePicker(item.id, item.date)}><Text style={styles.inputText}>{formatTime(item.date)} น.</Text></TouchableOpacity>
                                    <TouchableOpacity onPress={() => removeTimeRow(item.id)} style={styles.removeBtn}><Ionicons name="trash-outline" size={24} color="red" /></TouchableOpacity>
                                </View>
                            ))}
                            <TouchableOpacity style={styles.addTimeBtn} onPress={addTimeRow}><Text style={{ color: '#0056b3' }}>+ เพิ่มเวลา</Text></TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.intervalBox}>
                            <View style={styles.row}>
                                <View style={{ flex: 1 }}><Text>เริ่มทาน</Text><TouchableOpacity style={styles.timeInput} onPress={() => openTimePicker(null, startTime)}><Text>{formatTime(startTime)}</Text></TouchableOpacity></View>
                                <View style={{ flex: 1 }}><Text>ทุกๆ (ชม.)</Text><TextInput style={styles.input} keyboardType="numeric" value={intervalHours} onChangeText={setIntervalHours} /></View>
                            </View>
                        </View>
                    )}

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}><Text style={styles.label}>ทานครั้งละ</Text><TextInput style={styles.input} value={dosageAmount} keyboardType="numeric" onChangeText={setDosageAmount} placeholder="1" /></View>
                        <View style={{ flex: 1 }}><Text style={styles.label}>หน่วยนับ</Text><TextInput style={styles.input} value={unit} onChangeText={setUnit} /></View>
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}><Text style={styles.label}>จำนวนคลัง</Text><TextInput style={styles.input} value={quantity} keyboardType="numeric" onChangeText={setQuantity} placeholder="จำนวน" /></View>
                        <View style={{ flex: 1 }}><Text style={styles.label}>เตือนเมื่อต่ำกว่า</Text><TextInput style={styles.input} value={notifyThreshold} keyboardType="numeric" onChangeText={setNotifyThreshold} placeholder="5" /></View>
                    </View>

                    <Text style={[styles.label, { marginTop: 10 }]}>ระยะเวลาทานยา</Text>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity style={[styles.tab, durationMode === 'days' && styles.tabActive]} onPress={() => setDurationMode('days')}><Text>ระบุวัน</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.tab, durationMode === 'date' && styles.tabActive]} onPress={() => setDurationMode('date')}><Text>ถึงวันที่</Text></TouchableOpacity>
                    </View>

                    {durationMode === 'days' ? (<TextInput style={styles.input} keyboardType="numeric" value={durationDays} onChangeText={setDurationDays} placeholder="จำนวนวัน" />) : (<TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowEndDatePicker(true)}><Text style={styles.inputText}>{endDate.toLocaleDateString('th-TH')}</Text></TouchableOpacity>)}

                    {showTimePicker && (
                        Platform.OS === 'ios' ? (
                            <Modal transparent={true} animationType="fade">
                                <View style={styles.modalOverlay}>
                                    <View style={styles.modalContent}>
                                        <View style={styles.modalHeader}>
                                            <TouchableOpacity onPress={() => setShowTimePicker(false)}><Text style={{ color: 'red' }}>ยกเลิก</Text></TouchableOpacity>
                                            <TouchableOpacity onPress={confirmIOSTime}><Text style={{ color: '#0056b3', fontWeight: 'bold' }}>ตกลง</Text></TouchableOpacity>
                                        </View>
                                        <DateTimePicker value={tempDate} mode="time" display="spinner" is24Hour={true} onChange={(e, d) => setTempDate(d || tempDate)} style={{ height: 200 }} />
                                    </View>
                                </View>
                            </Modal>
                        ) : (<DateTimePicker value={tempDate} mode="time" display="default" is24Hour={true} onChange={onTimeSelectedAndroid} />)
                    )}

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>บันทึกข้อมูล</Text>}
                    </TouchableOpacity>
                    <View style={{ height: 50 }} />
                </View>
            </KeyboardWrapper>
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
    modalContent: { backgroundColor: '#e0e0e0', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, paddingHorizontal: 10 }
});