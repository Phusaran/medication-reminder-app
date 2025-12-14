import React, { useState, useEffect, useRef } from 'react'; // 👈 เพิ่ม useRef
import { View, Text, StyleSheet, Button, Alert, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

// ⚠️ เช็ค IP ให้ตรง
const API_URL = 'http://192.168.0.31:3000/api/caregivers/link-qr';

export default function ScanScreen({ route, navigation }) {
  const { caregiverId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  
  // ✅ ใช้ useRef เพื่อล็อคการทำงานทันที (ไวกว่า useState)
  const isProcessing = useRef(false); 
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  // เมื่อเข้ามาหน้านี้ รีเซ็ตค่าล็อคให้พร้อมทำงาน
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

  const handleBarCodeScanned = async ({ data }) => {
    // 🔒 1. เช็คตัวล็อคก่อน ถ้ากำลังทำงานอยู่ ให้หยุดทันที
    if (isProcessing.current) return;
    
    // 🔒 2. ล็อคทันที! ไม่ให้ใครแซง
    isProcessing.current = true;
    setScanned(true); // อัปเดต UI (เช่นซ่อนกรอบ หรือขึ้น loading)

    console.log("Scanned:", data);

    try {
        const inviteCode = data;
        
        await axios.post(API_URL, {
            caregiver_id: caregiverId,
            invite_code: inviteCode 
        });

        Alert.alert("สำเร็จ!", "เพิ่มผู้ป่วยเรียบร้อยแล้ว", [
            { 
                text: "ตกลง", 
                onPress: () => {
                    // กลับหน้าเดิม ไม่ต้องปลดล็อคเพราะเดี๋ยว Component ก็ถูกทำลาย
                    navigation.goBack();
                } 
            }
        ]);

    } catch (error) {
        // 🔓 3. ถ้า Error ให้ปลดล็อค "เฉพาะเมื่อกดปุ่มตกลงแล้วเท่านั้น"
        Alert.alert("ผิดพลาด", error.response?.data?.message || "QR Code ไม่ถูกต้อง", [
            { 
                text: "ลองใหม่", 
                onPress: () => {
                    isProcessing.current = false; // ปลดล็อค
                    setScanned(false); // เริ่มสแกนใหม่
                } 
            }
        ]);
    }
  };

  return (
    <View style={styles.container}>
        <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            // ถ้า scanned เป็น true ให้ส่ง undefined เพื่อปิดการรับค่าจากกล้อง
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
                barcodeTypes: ["qr"],
            }}
        />
        
        <View style={styles.overlay}>
            <View style={[styles.scanFrame, scanned && { borderColor: 'yellow' }]} />
            <Text style={styles.instructionText}>
                {scanned ? "กำลังประมวลผล..." : "ส่องไปที่ QR Code ของผู้ป่วย"}
            </Text>
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={30} color="#fff" />
        </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 250, height: 250, borderWidth: 2, borderColor: '#00ff00', backgroundColor: 'transparent', borderRadius: 20 },
  instructionText: { color: '#fff', marginTop: 20, fontSize: 16, backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 5 },
  closeBtn: { position: 'absolute', top: 50, right: 20, padding: 10 }
});