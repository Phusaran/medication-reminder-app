import React, { useState, useEffect, useRef } from 'react';
// ✅ Import Keyboard และ TouchableWithoutFeedback เพิ่มเข้ามา
import { View, Text, StyleSheet, Button, Alert, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
// ✅ Import Config
import { API_URL } from '../constants/config';

export default function ScanScreen({ route, navigation }) {
  const { caregiverId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const isProcessing = useRef(false); 
  const [scanned, setScanned] = useState(false);
  
  // ✅ เพิ่ม State สำหรับกรอกรหัสเอง
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  useEffect(() => {
      isProcessing.current = false;
      setScanned(false);
  }, []);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{textAlign:'center', marginTop:50}}>ขออนุญาตใช้กล้อง</Text>
        <Button onPress={requestPermission} title="อนุญาต" />
      </View>
    );
  }

  // ✅ ฟังก์ชันสแกนด้วยกล้อง
  const handleBarCodeScanned = async ({ data }) => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    setScanned(true);

    try {
        const inviteCodeFromQR = data;
        
        await axios.post(`${API_URL}/caregivers/link-qr`, {
            caregiver_id: caregiverId,
            invite_code: inviteCodeFromQR 
        });

        Alert.alert("สำเร็จ!", "เพิ่มผู้ป่วยเรียบร้อยแล้ว", [
            { text: "ตกลง", onPress: () => { navigation.goBack(); } }
        ]);

    } catch (error) {
        Alert.alert("ผิดพลาด", error.response?.data?.message || "QR Code ไม่ถูกต้อง", [
            { text: "ลองใหม่", onPress: () => { isProcessing.current = false; setScanned(false); } }
        ]);
    }
  };

  // ✅ ฟังก์ชันกรอกรหัสด้วยตัวเอง
  const handleManualLink = async () => {
    if (!inviteCode.trim()) {
        Alert.alert('แจ้งเตือน', 'กรุณากรอกรหัสเชิญ 6 หลัก');
        return;
    }
    
    try {
        await axios.post(`${API_URL}/caregivers/link-qr`, {
            caregiver_id: caregiverId, 
            invite_code: inviteCode.trim().toUpperCase() // บังคับตัวพิมพ์ใหญ่
        });
        
        Alert.alert("สำเร็จ!", "เพิ่มผู้ป่วยเรียบร้อยแล้ว", [
            { text: "ตกลง", onPress: () => { navigation.goBack(); } }
        ]);
        
    } catch (error) {
        Alert.alert("ผิดพลาด", error.response?.data?.message || "รหัสเชิญไม่ถูกต้อง");
    }
  };

  return (
    // ✅ ครอบด้วย TouchableWithoutFeedback เพื่อให้แตะหน้าจอแล้วซ่อนคีย์บอร์ดได้
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            {/* กล้องอยู่พื้นหลัง */}
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            />
            
            <View style={styles.overlay}>
                {/* กรอบสแกน */}
                <View style={[styles.scanFrame, scanned && { borderColor: 'yellow' }]} />
                <Text style={styles.instructionText}>
                    {scanned ? "กำลังประมวลผล..." : "ส่องไปที่ QR Code ของผู้ป่วย"}
                </Text>
            </View>

            {/* ✅ กล่องกรอกรหัสด้านล่างจอ */}
            <View style={styles.manualContainer}>
                <Text style={styles.manualLabel}>หรือกรอกรหัส 6 หลักด้วยตัวเอง:</Text>
                <View style={styles.inputRow}>
                    <TextInput 
                        style={styles.codeInput} 
                        placeholder="A1B2C3" 
                        placeholderTextColor="#999"
                        value={inviteCode} 
                        onChangeText={setInviteCode} 
                        autoCapitalize="characters" 
                        maxLength={6}
                    />
                    <TouchableOpacity style={styles.submitButton} onPress={handleManualLink}>
                        <Text style={styles.submitButtonText}>ยืนยัน</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
        </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 250, height: 250, borderWidth: 2, borderColor: '#00ff00', backgroundColor: 'transparent', borderRadius: 20 },
  instructionText: { color: '#fff', marginTop: 20, fontSize: 16, backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 5 },
  closeBtn: { position: 'absolute', top: 50, right: 20, padding: 10 },
  
  // ✅ สไตล์สำหรับกล่องกรอกรหัส
  manualContainer: {
      position: 'absolute',
      bottom: 40,
      width: '90%',
      alignSelf: 'center',
      backgroundColor: 'rgba(255,255,255,0.95)',
      padding: 20,
      borderRadius: 15,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
  },
  manualLabel: { fontSize: 14, color: '#333', fontWeight: 'bold', marginBottom: 10 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between' },
  codeInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff', marginRight: 10, letterSpacing: 3, textAlign: 'center', fontWeight: 'bold' },
  submitButton: { backgroundColor: '#0056b3', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 8 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});