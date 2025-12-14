import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Button, Alert, TouchableOpacity } from 'react-native';
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

  const handleBarCodeScanned = async ({ data }) => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    setScanned(true);

    try {
        const inviteCode = data;
        
        // ✅ แก้ Path: /caregivers/link-qr
        await axios.post(`${API_URL}/caregivers/link-qr`, {
            caregiver_id: caregiverId,
            invite_code: inviteCode 
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

  return (
    <View style={styles.container}>
        <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        />
        <View style={styles.overlay}>
            <View style={[styles.scanFrame, scanned && { borderColor: 'yellow' }]} />
            <Text style={styles.instructionText}>{scanned ? "กำลังประมวลผล..." : "ส่องไปที่ QR Code ของผู้ป่วย"}</Text>
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