import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import axios from 'axios';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications'; // ✅ 1. เพิ่ม Import Notifications
import { API_URL } from '../constants/config';

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
      // ดึงยาทั้งหมด (ทั้งเปิดและปิด) มาแสดงใน list
      const response = await axios.get(`${API_URL}/medications/${user.id}?all=true`);
      
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

  // ✅ 2. ฟังก์ชันรีเซ็ตการแจ้งเตือน (Sync ให้ตรงกับ Database)
  const resyncNotifications = async () => {
      try {
          // A. ยกเลิกของเก่าทั้งหมดก่อน
          await Notifications.cancelAllScheduledNotificationsAsync();

          // B. ดึงเฉพาะยาที่ "Active" และ "ไม่ถูกลบ" มาใหม่
          const response = await axios.get(`${API_URL}/medications/${user.id}`); 
          const activeSchedules = response.data;

          // C. วนลูปตั้งปลุกใหม่ทีละอัน
          for (const item of activeSchedules) {
              if (!item.time_to_take) continue;

              // แปลงเวลาให้เป็นตัวเลขที่แน่นอน
              const [hours, minutes] = item.time_to_take.split(':').map(Number);
              
              // ป้องกันกรณีเวลามาไม่ครบ หรือไม่ใช่ตัวเลข
              if (isNaN(hours) || isNaN(minutes)) continue;

              await Notifications.scheduleNotificationAsync({
                  content: {
                      title: "⏰ ได้เวลาทานยาแล้ว!",
                      body: `อย่าลืมทานยา: ${item.custom_name} (${item.dosage_amount} ${item.dosage_unit})`,
                      sound: true,
                      vibrate: [0, 250, 250, 250], // เพิ่มสั่นเตือน (Android)
                  },
                  trigger: { 
                      // ✅✅✅ แก้ไขตรงนี้: ต้องระบุ type ให้ชัดเจน ✅✅✅
                      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                      hour: hours, 
                      minute: minutes, 
                      repeats: true 
                  }
              });
          }
          console.log("Notifications Resynced Successfully!");

      } catch (error) {
          console.log("Resync Error:", error);
      }
  };

  const deleteMedication = (medId) => {
    Alert.alert('ยืนยัน', 'ต้องการลบยานี้หรือไม่?', [
      { text: 'ยกเลิก' },
      { text: 'ลบ', style: 'destructive', onPress: async () => {
          try {
            // 1. ลบใน Database (Soft Delete)
            await axios.delete(`${API_URL}/medications/${medId}`);
            
            // 2. โหลดรายการใหม่
            fetchMedications(); 

            // 3. ✅ รีเซ็ตการแจ้งเตือน (เอายาที่ลบออกไปจากการแจ้งเตือน)
            await resyncNotifications();

          } catch (error) { console.log(error); }
      }}
    ]);
  };

  const renderItem = ({ item }) => {
    const isActive = item.is_active === 1; 

    return (
      <View style={[styles.card, !isActive && styles.cardInactive]}> 
        {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={[styles.icon, !isActive && {opacity: 0.5}]} />
        ) : (
            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3022/3022268.png' }} style={[styles.icon, !isActive && {opacity: 0.5}]} />
        )}
        
        <View style={{flex: 1}}>
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
              <Text style={[styles.name, !isActive && {color: '#999'}]}>
                  {item.custom_name} {isActive ? '' : '(ปิดใช้งาน)'}
              </Text>
              
              
          </View>

          <Text style={styles.detail}>
              คงเหลือ: {item.current_quantity} {item.dosage_unit}
          </Text>
          
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
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {caregiver && (
        <TouchableOpacity
            onPress={() => navigation.navigate('CaregiverHome', { caregiver: caregiver })}
            style={{ backgroundColor: '#ff9800', padding: 10, alignItems: 'center', paddingTop: 40 }}
        >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' }}>
                👁️ คุณ{caregiver.firstname} กำลังดูคลังยาของ {user.firstname}
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
  cardInactive: { backgroundColor: '#f9f9f9' }, 
  icon: { width: 40, height: 40, marginRight: 15, borderRadius: 20, backgroundColor: '#eee' },
  name: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  detail: { color: '#666' },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 60, height: 60, backgroundColor: '#0056b3', borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#fff', fontSize: 30 }
});