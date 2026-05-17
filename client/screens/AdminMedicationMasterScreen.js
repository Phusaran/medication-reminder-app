import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal, Image, ScrollView } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../constants/config';

export default function AdminMedicationMasterScreen({ navigation }) {
    const [meds, setMeds] = useState([]);

    // State สำหรับเพิ่มยาใหม่
    const [name, setName] = useState('');
    const [tradeName, setTradeName] = useState(''); // ❇️ เพิ่ม
    const [mg, setMg] = useState(''); // ❇️ เพิ่ม
    const [desc, setDesc] = useState('');
    const [unit, setUnit] = useState('เม็ด');
    const [imageUrl, setImageUrl] = useState('');
    const [drugType, setDrugType] = useState('');
    const [defaultDiseaseGroup, setDefaultDiseaseGroup] = useState('');

    // State สำหรับแก้ไข
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingMed, setEditingMed] = useState({
        med_id: '', generic_name: '', trade_name: '', mg: '', description: '', dosage_unit: '', image_url: '', drug_type: '', default_disease_group: ''
    });

    useEffect(() => { fetchMeds(); }, []);

    const fetchMeds = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/medications`);
            setMeds(response.data);
        } catch (error) { console.log(error); }
    };

    const handleAdd = async () => {
        if (!name) return Alert.alert('แจ้งเตือน', 'กรุณาระบุชื่อยา');
        try {
            await axios.post(`${API_URL}/admin/medications`, {
                generic_name: name,
                trade_name: tradeName || null,
                mg: mg ? parseFloat(mg) : null,
                description: desc,
                dosage_unit: unit,
                image_url: imageUrl,
                drug_type: drugType,
                default_disease_group: defaultDiseaseGroup
            });
            setName(''); setTradeName(''); setMg(''); setDesc(''); setImageUrl(''); setDrugType(''); setDefaultDiseaseGroup('');
            fetchMeds();
            Alert.alert('สำเร็จ', 'เพิ่มยาเรียบร้อย');
        } catch (error) { Alert.alert('ผิดพลาด', 'เพิ่มยาไม่สำเร็จ'); }
    };

    const handleDelete = (id) => {
        Alert.alert('ยืนยัน', 'ลบยาออกจากคลังหลัก?', [
            { text: 'ยกเลิก' },
            {
                text: 'ลบ', style: 'destructive', onPress: async () => {
                    try {
                        await axios.delete(`${API_URL}/admin/master-medications/${id}`);
                        fetchMeds();
                    } catch (err) { Alert.alert('ผิดพลาด', 'ลบไม่ได้'); }
                }
            }
        ]);
    };

    const openEdit = (item) => {
        setEditingMed({
            med_id: item.med_id,
            generic_name: item.generic_name,
            trade_name: item.trade_name || '',
            mg: item.mg ? String(item.mg) : '',
            description: item.description,
            dosage_unit: item.dosage_unit,
            image_url: item.image_url || '',
            drug_type: item.drug_type || '',
            default_disease_group: item.default_disease_group || ''
        });
        setEditModalVisible(true);
    };

    const handleUpdate = async () => {
        try {
            const payload = { ...editingMed, mg: editingMed.mg ? parseFloat(editingMed.mg) : null };
            await axios.put(`${API_URL}/admin/master-medications/${editingMed.med_id}`, payload);
            setEditModalVisible(false);
            fetchMeds();
            Alert.alert('สำเร็จ', 'อัปเดตข้อมูลเรียบร้อย');
        } catch (error) { Alert.alert('ผิดพลาด', 'บันทึกข้อมูลไม่สำเร็จ'); }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
                <Text style={styles.title}>คลังยาหลัก ({meds.length})</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* ฟอร์มเพิ่มยาใหม่ */}
            <View style={styles.formContainer}>
                <ScrollView style={styles.form} nestedScrollEnabled={true}>
                    <Text style={styles.formHeader}>+ เพิ่มยาใหม่</Text>

                    <Text style={styles.label}>ชื่อยาสามัญ (Generic Name):</Text>
                    <TextInput style={styles.input} placeholder="เช่น Paracetamol" value={name} onChangeText={setName} />

                    {/* ❇️ ช่องใหม่: ชื่อการค้า และ mg */}
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.label}>ชื่อการค้า (Trade Name):</Text>
                            <TextInput style={styles.input} placeholder="เช่น Tylenol" value={tradeName} onChangeText={setTradeName} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>ปริมาณ (mg):</Text>
                            <TextInput style={styles.input} placeholder="500" keyboardType="numeric" value={mg} onChangeText={setMg} />
                        </View>
                    </View>

                    <Text style={styles.label}>กลุ่มโรคเริ่มต้น (Default Disease Group):</Text>
                    <TextInput style={styles.input} placeholder="เช่น แก้ปวด / เบาหวาน" value={defaultDiseaseGroup} onChangeText={setDefaultDiseaseGroup} />

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.label}>หน่วยนับ:</Text>
                            <TextInput style={styles.input} placeholder="เม็ด" value={unit} onChangeText={setUnit} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>ประเภทตัวยา:</Text>
                            <TextInput style={styles.input} placeholder="ยาเม็ด" value={drugType} onChangeText={setDrugType} />
                        </View>
                    </View>

                    <Text style={styles.label}>สรรพคุณ:</Text>
                    <TextInput style={styles.input} placeholder="รายละเอียดการใช้" value={desc} onChangeText={setDesc} />

                    <Text style={styles.label}>URL รูปภาพยา:</Text>
                    <TextInput style={styles.input} placeholder="https://..." value={imageUrl} onChangeText={setImageUrl} />

                    <TouchableOpacity style={styles.btn} onPress={handleAdd}>
                        <Text style={styles.btnText}>เพิ่มลงคลังหลัก</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            <FlatList
                data={meds}
                keyExtractor={item => item.med_id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Image source={{ uri: item.image_url || 'https://cdn-icons-png.flaticon.com/512/822/822092.png' }} style={styles.medIcon} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.name}>{item.generic_name}</Text>
                            {/* ❇️ ส่วนที่แสดง Trade Name และ mg ในการ์ดยา */}
                            <Text style={styles.subText}>
                                {item.trade_name ? `(${item.trade_name}) ` : ''}
                                {item.mg ? `${item.mg} mg` : ''}
                            </Text>
                            <Text style={styles.groupText}>{item.default_disease_group || 'ทั่วไป'}</Text>
                        </View>
                        <View style={styles.actionGroup}>
                            <TouchableOpacity style={{ marginRight: 15 }} onPress={() => openEdit(item)}>
                                <Ionicons name="create-outline" size={24} color="#0056b3" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item.med_id)}>
                                <Ionicons name="trash-outline" size={24} color="red" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
            />

            {/* Modal แก้ไขข้อมูล */}
            <Modal visible={editModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalTitle}>แก้ไขข้อมูลยาหลัก</Text>
                            <View style={{ alignItems: 'center', marginBottom: 15 }}>
                                <Image source={{ uri: editingMed.image_url || 'https://cdn-icons-png.flaticon.com/512/822/822092.png' }} style={styles.previewImage} />
                            </View>

                            <Text style={styles.label}>ชื่อยาสามัญ:</Text>
                            <TextInput style={styles.input} value={editingMed.generic_name} onChangeText={(t) => setEditingMed({ ...editingMed, generic_name: t })} />

                            {/* ❇️ เพิ่มในฟอร์มแก้ไข */}
                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={styles.label}>ชื่อการค้า:</Text>
                                    <TextInput style={styles.input} value={editingMed.trade_name} onChangeText={(t) => setEditingMed({ ...editingMed, trade_name: t })} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>ปริมาณ (mg):</Text>
                                    <TextInput style={styles.input} value={editingMed.mg} keyboardType="numeric" onChangeText={(t) => setEditingMed({ ...editingMed, mg: t })} />
                                </View>
                            </View>

                            <Text style={styles.label}>กลุ่มโรคเริ่มต้น:</Text>
                            <TextInput style={styles.input} value={editingMed.default_disease_group} onChangeText={(t) => setEditingMed({ ...editingMed, default_disease_group: t })} />

                            <Text style={styles.label}>ประเภทตัวยา:</Text>
                            <TextInput style={styles.input} value={editingMed.drug_type} onChangeText={(t) => setEditingMed({ ...editingMed, drug_type: t })} />

                            <Text style={styles.label}>สรรพคุณ:</Text>
                            <TextInput style={styles.input} value={editingMed.description} onChangeText={(t) => setEditingMed({ ...editingMed, description: t })} />

                            <Text style={styles.label}>หน่วยนับ:</Text>
                            <TextInput style={styles.input} value={editingMed.dosage_unit} onChangeText={(t) => setEditingMed({ ...editingMed, dosage_unit: t })} />

                            <Text style={styles.label}>URL รูปภาพ:</Text>
                            <TextInput style={styles.input} value={editingMed.image_url} onChangeText={(t) => setEditingMed({ ...editingMed, image_url: t })} />

                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}><Text>ยกเลิก</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate}><Text style={styles.saveText}>บันทึกข้อมูล</Text></TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#fff', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
    title: { fontSize: 18, fontWeight: 'bold' },
    formContainer: { maxHeight: 380, backgroundColor: '#fff', elevation: 3 },
    form: { padding: 20 },
    formHeader: { fontWeight: 'bold', color: '#2e7d32', marginBottom: 15, fontSize: 16 },
    label: { fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 5, marginLeft: 5 },
    row: { flexDirection: 'row' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, marginBottom: 15, backgroundColor: '#fafafa' },
    btn: { backgroundColor: '#2e7d32', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
    btnText: { color: '#fff', fontWeight: 'bold' },
    card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10, elevation: 1 },
    medIcon: { width: 50, height: 50, borderRadius: 10, marginRight: 15, backgroundColor: '#f0f0f0' },
    name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    subText: { fontSize: 12, color: '#666', marginTop: 2 },
    groupText: { color: '#0056b3', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
    actionGroup: { flexDirection: 'row' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 25, padding: 25, maxHeight: '85%' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    previewImage: { width: 100, height: 100, borderRadius: 15, backgroundColor: '#eee' },
    modalActions: { flexDirection: 'row', marginTop: 15 },
    cancelBtn: { flex: 1, padding: 15, marginRight: 10, backgroundColor: '#eee', borderRadius: 12, alignItems: 'center' },
    saveBtn: { flex: 1, padding: 15, backgroundColor: '#2e7d32', borderRadius: 12, alignItems: 'center' },
    saveText: { color: '#fff', fontWeight: 'bold' }
});