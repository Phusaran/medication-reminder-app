import React, { useState, useEffect } from 'react';
// ✅ 1. เพิ่ม Alert ตรงนี้
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import axios from 'axios';
import { useIsFocused } from '@react-navigation/native';
// ✅ 2. เพิ่ม Ionicons ตรงนี้
import { Ionicons } from '@expo/vector-icons';

// ⚠️ เช็ค IP ให้ตรง
const API_URL = 'http://192.168.0.31:3000/api/medications';

export default function StockScreen({ navigation, route }) {
  const user = route.params?.user || { id: 0 }; 
  const caregiver = route.params?.caregiver; 

  const [medications, setMedications] = useState([]);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused && user.id !== 0) fetchMedications();
  }, [isFocused]);

  const fetchMedications = async () => {
    try {
      const response = await axios.get(`${API_URL}/${user.id}`);
      
      // กรองยาซ้ำออก (โชว์เฉพาะยาที่ไม่ซ้ำกัน)
      const allMeds = response.data;
      const uniqueMeds = [];
      const map = new Map();

      for (const item of allMeds) {
          if (!map.has(item.user_med_id)) {
              map.set(item.user_med_id, true);
              uniqueMeds.push(item);
          }
      }
      
      setMedications(uniqueMeds);
    } catch (error) { console.log(error); }
  };

  // ✅ ฟังก์ชันลบยา
  const deleteMedication = (medId) => {
    Alert.alert('ยืนยัน', 'ต้องการลบยานี้หรือไม่?', [
      { text: 'ยกเลิก' },
      { text: 'ลบ', style: 'destructive', onPress: async () => {
          try {
            await axios.delete(`${API_URL}/${medId}`);
            fetchMedications(); // โหลดรายการใหม่หลังลบ
          } catch (error) { console.log(error); }
      }}
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.icon} />
      ) : (
          <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3022/3022268.png' }} style={styles.icon} />
      )}
      
      <View style={{flex: 1}}>
        <Text style={styles.name}>{item.custom_name}</Text>
        <Text style={styles.detail}>{item.dosage_amount} {item.dosage_unit}</Text>
        
        {/* ✅ ปุ่ม Action (แก้ไข / ลบ) */}
        <View style={{flexDirection: 'row', marginTop: 8}}>
            <TouchableOpacity 
                style={{marginRight: 15, flexDirection: 'row', alignItems: 'center'}}
                onPress={() => navigation.navigate('EditMedication', { medication: item })}
            >
                <Ionicons name="create-outline" size={18} color="#0056b3" />
                <Text style={{color: '#0056b3', marginLeft: 4, fontSize: 12}}>แก้ไข</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={{flexDirection: 'row', alignItems: 'center'}}
                onPress={() => deleteMedication(item.user_med_id)}
            >
                <Ionicons name="trash-outline" size={18} color="#f44336" />
                <Text style={{color: '#f44336', marginLeft: 4, fontSize: 12}}>ลบ</Text>
            </TouchableOpacity>
        </View>
      </View>

      <View style={styles.stockBadge}>
        <Text style={styles.stockText}>เหลือ {item.current_quantity}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Banner ผู้ดูแล */}
      {caregiver && (
        <TouchableOpacity
            onPress={() => navigation.navigate('CaregiverHome', { caregiver: caregiver })}
            style={{ backgroundColor: '#ff9800', padding: 10, alignItems: 'center', paddingTop: 40 }}
        >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' }}>
                👁️ คุณ{caregiver.firstname} กำลังดูคลังยาของ {user.firstname}
                {'\n'}(แตะเพื่อกลับหน้าหลักผู้ดูแล)
            </Text>
        </TouchableOpacity>
      )}

      <Text style={[styles.header, caregiver && { paddingTop: 20 }]}>
        คลังยาของฉัน
      </Text>

      <FlatList 
        data={medications} 
        renderItem={renderItem} 
        keyExtractor={item => item.user_med_id.toString()} 
        contentContainerStyle={{padding: 20}}
      />
      
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('MasterSearch', { user })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', padding: 20, paddingTop: 50, backgroundColor: '#f5f5f5' },
  card: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
  icon: { width: 40, height: 40, marginRight: 15, borderRadius: 20, backgroundColor: '#eee' },
  name: { fontSize: 16, fontWeight: 'bold' },
  detail: { color: '#666' },
  stockBadge: { backgroundColor: '#e3f2fd', padding: 5, borderRadius: 5 },
  stockText: { color: '#0056b3', fontWeight: 'bold', fontSize: 12 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 60, height: 60, backgroundColor: '#0056b3', borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#fff', fontSize: 30 }
});