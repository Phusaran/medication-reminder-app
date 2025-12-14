// ไฟล์: screens/CaregiverProfileScreen.js

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; // 📸 เพิ่ม ImagePicker

// ⚠️ เช็ค IP ให้ตรง
const BASE_URL = 'http://192.168.0.31:3000'; 
const API_URL = `${BASE_URL}/api`;

export default function CaregiverProfileScreen({ route, navigation }) {
    const { caregiver } = route.params;

    const [firstname, setFirstname] = useState(caregiver.firstname);
    const [lastname, setLastname] = useState(caregiver.lastname);
    const [password, setPassword] = useState('');
    
    // ✅ State สำหรับรูปภาพ
    const [image, setImage] = useState(caregiver.profile_image); 
    const [newImageSelected, setNewImageSelected] = useState(false);
    const [loading, setLoading] = useState(false);

    // ✅ ฟังก์ชันเลือกรูปจากเครื่อง (เหมือนของ User)
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('ขออภัย', 'ต้องการสิทธิ์เข้าถึงรูปภาพ');
          return;
        }
    
        let result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
        });
    
        if (!result.canceled) {
          setImage(result.assets[0].uri);
          setNewImageSelected(true);
        }
    };

    const handleSave = async () => {
        if (!firstname || !lastname) {
            Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อและนามสกุล');
            return;
        }

        setLoading(true);
        try {
            let finalImageUrl = image;

            // ✅ 1. ถ้ามีการเลือกรูปใหม่ ให้อัปโหลดไป Server ก่อน
            if (newImageSelected) {
                const formData = new FormData();
                formData.append('profileImage', {
                    uri: image,
                    name: 'caregiver_profile.jpg',
                    type: 'image/jpeg',
                });

                const uploadRes = await axios.post(`${BASE_URL}/api/upload`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });

                if (uploadRes.status === 200) {
                    finalImageUrl = uploadRes.data.url;
                }
            }

            // ✅ 2. อัปเดตข้อมูลลงฐานข้อมูล (ส่ง URL รูปไปด้วย)
            const response = await axios.put(`${API_URL}/caregivers/${caregiver.caregiver_id}`, {
                firstname,
                lastname,
                password,
                profile_image: finalImageUrl // ส่ง URL
            });

            if (response.status === 200) {
                Alert.alert('สำเร็จ', 'บันทึกข้อมูลเรียบร้อย', [
                    { 
                        text: 'ตกลง', 
                        onPress: () => {
                            // ส่งข้อมูลใหม่กลับไปอัปเดตหน้า Home
                            navigation.navigate('CaregiverHome', { caregiver: response.data }); 
                        } 
                    }
                ]);
            }
        } catch (error) {
            console.log(error);
            Alert.alert('ผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>แก้ไขโปรไฟล์ผู้ดูแล</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* ✅ ส่วนแสดงรูปภาพ Avatar */}
                <View style={styles.avatarContainer}>
                    <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
                        {image ? (
                            <Image source={{ uri: image }} style={styles.avatarImage} />
                        ) : (
                            <View style={[styles.avatarImage, styles.placeholderAvatar]}>
                                <Text style={styles.avatarText}>{firstname ? firstname.charAt(0) : '?'}</Text>
                            </View>
                        )}
                        <View style={styles.cameraIcon}>
                            <Ionicons name="camera" size={20} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.changePhotoText}>แตะเพื่อเปลี่ยนรูป</Text>
                    <Text style={styles.emailText}>{caregiver.email}</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>ชื่อจริง</Text>
                    <TextInput style={styles.input} value={firstname} onChangeText={setFirstname} />

                    <Text style={styles.label}>นามสกุล</Text>
                    <TextInput style={styles.input} value={lastname} onChangeText={setLastname} />

                    <Text style={styles.label}>รหัสผ่านใหม่ (ว่างไว้ถ้าไม่เปลี่ยน)</Text>
                    <TextInput 
                        style={styles.input} 
                        value={password} 
                        onChangeText={setPassword} 
                        secureTextEntry 
                        placeholder="กรอกรหัสผ่านใหม่"
                    />

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>บันทึกการเปลี่ยนแปลง</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    header: { backgroundColor: '#0056b3', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    content: { padding: 20 },
    
    // Avatar Styles
    avatarContainer: { alignItems: 'center', marginBottom: 20 },
    avatarWrapper: { position: 'relative' },
    avatarImage: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#e3f2fd' },
    placeholderAvatar: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#bbdefb' },
    avatarText: { fontSize: 40, color: '#0056b3', fontWeight: 'bold' },
    cameraIcon: {
        position: 'absolute', bottom: 0, right: 0,
        backgroundColor: '#0056b3', width: 32, height: 32, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff'
    },
    changePhotoText: { color: '#0056b3', marginTop: 10, fontWeight: 'bold', fontSize: 14 },
    emailText: { color: '#666', marginTop: 5 },

    form: { marginTop: 10 },
    label: { color: '#333', marginBottom: 5, fontWeight: 'bold', marginTop: 10 },
    input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', fontSize: 16 },
    saveBtn: { backgroundColor: '#0056b3', padding: 15, borderRadius: 10, marginTop: 30, alignItems: 'center', elevation: 2 },
    saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});