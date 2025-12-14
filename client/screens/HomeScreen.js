import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, Alert, Image } from 'react-native'; // ✅ ใช้ SectionList
import axios from 'axios';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'http://192.168.0.31:3000/api'; 

export default function HomeScreen({ route, navigation }) {
  const user = route.params?.user || { id: 0, firstname: 'Guest' }; 
  const [medSections, setMedSections] = useState([]); // ✅ เก็บข้อมูลแบบ Sections
  const isFocused = useIsFocused();
  const caregiver = route.params?.caregiver;
  
  const currentDate = new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    if (isFocused && user.id !== 0) fetchMedications();
  }, [isFocused]);

  const fetchMedications = async () => {
    try {
      const response = await axios.get(`${API_URL}/medications/${user.id}`);
      const rawData = response.data;

      // ✅✅✅ เพิ่มการกรองข้อมูลซ้ำ (Deduplicate) ✅✅✅
      // ป้องกันกรณี Database มีข้อมูล Stock หรือ Schedule ซ้ำกัน
      const uniqueData = [];
      const map = new Map();

      for (const item of rawData) {
          // ถ้ามี schedule_id ให้ใช้เป็นตัวเช็คซ้ำ, ถ้าไม่มีให้ใช้ user_med_id
          const uniqueKey = item.schedule_id ? `sch_${item.schedule_id}` : `med_${item.user_med_id}`;
          
          if (!map.has(uniqueKey)) {
              map.set(uniqueKey, true);
              uniqueData.push(item);
          }
      }

      // จัดกลุ่มข้อมูลตาม disease_group (ใช้ข้อมูลที่กรองแล้ว)
      const grouped = uniqueData.reduce((acc, item) => {
          const groupName = item.disease_group || 'ยาอื่นๆ'; 
          if (!acc[groupName]) acc[groupName] = [];
          acc[groupName].push(item);
          return acc;
      }, {});

      // แปลงเป็น format ของ SectionList
      const sections = Object.keys(grouped).map(key => ({
          title: key,
          data: grouped[key].sort((a, b) => a.time_to_take.localeCompare(b.time_to_take)) 
      })).sort((a, b) => a.title.localeCompare(b.title)); 

      setMedSections(sections);
    } catch (error) { console.log("Fetch Error:", error); }
  };

  const handleTakePill = async (item) => {
    try {
        const response = await axios.post(`${API_URL}/log-dose`, {
           user_med_id: item.user_med_id,
           schedule_id: item.schedule_id,
           status: 'taken'
       });
       if (response.status === 200) {
           Alert.alert("เยี่ยมมาก!", "บันทึกการกินยาเรียบร้อย");
           fetchMedications();
       }
    } catch (error) { Alert.alert("ผิดพลาด", "ไม่สามารถบันทึกได้"); }
  };

  const handleLogout = () => navigation.replace('Login');

  // ✅ Render ยาแต่ละตัว
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.pillIcon} />
        ) : (
            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/822/822092.png' }} style={styles.pillIcon} />
        )}
        <View>
            <Text style={styles.medName}>{item.custom_name}</Text>
            <Text style={styles.medDetail}>{item.dosage_amount} {item.dosage_unit} • {item.instruction}</Text>
            <Text style={styles.medTime}>เวลา: {item.time_to_take ? item.time_to_take.substring(0, 5) : '00:00'} น.</Text>
        </View>
      </View>
      <View style={styles.statusContainer}>
         <TouchableOpacity style={[styles.statusBtn, {backgroundColor: '#e3f2fd'}]} onPress={() => handleTakePill(item)}>
             <Text style={{fontSize: 18}}>✔️</Text>
         </TouchableOpacity>
      </View>
    </View>
  );

  // ✅ Render หัวข้อกลุ่มโรค
  const renderSectionHeader = ({ section: { title } }) => (
      <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionHeaderText}>{title}</Text>
      </View>
  );

  return (
    <View style={styles.container}>
      {caregiver && (
        <TouchableOpacity onPress={() => navigation.navigate('CaregiverHome', { caregiver })} style={styles.banner}>
            <Text style={styles.bannerText}>👁️ คุณ{caregiver.firstname} กำลังดูข้อมูลของ {user.firstname}</Text>
        </TouchableOpacity>
      )}
      
      <View style={[styles.header, caregiver && { paddingTop: 20 }]}>
        <View>
            <Text style={styles.greeting}>สวัสดี, คุณ{user.firstname}</Text>
            <Text style={styles.subGreeting}>{currentDate}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}><Text style={styles.logoutText}>ออก</Text></TouchableOpacity>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('AddSymptom', { user })}>
            <Ionicons name="thermometer" size={24} color="#d32f2f" />
            <Text style={styles.actionText}>บันทึกอาการป่วย</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>ตารางยาของวันนี้</Text>
        
        {medSections.length === 0 ? (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>ไม่มีรายการยาสำหรับวันนี้</Text>
                <Text style={styles.emptySubText}>กดปุ่ม + ด้านล่างเพื่อเพิ่มยา</Text>
            </View>
        ) : (
            // ✅ ใช้ SectionList แทน FlatList
            <SectionList
                sections={medSections}
                keyExtractor={(item) => item.schedule_id ? item.schedule_id.toString() : Math.random().toString()}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                contentContainerStyle={{ paddingBottom: 80 }}
                stickySectionHeadersEnabled={false} // หัวข้อเลื่อนไปพร้อมรายการ
            />
        )}
      </View>

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('MasterSearch', { user })}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  banner: { backgroundColor: '#ff9800', padding: 10, alignItems: 'center', paddingTop: 40 },
  bannerText: { color: '#fff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  header: { backgroundColor: '#0056b3', paddingTop: 50, paddingBottom: 30, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  subGreeting: { color: '#d1e3ff', fontSize: 14, marginTop: 4 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 10 },
  logoutText: { color: '#fff', fontWeight: 'bold' },
  actionContainer: { marginTop: -20, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'center' },
  actionButton: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 25, alignItems: 'center', elevation: 5 },
  actionText: { marginLeft: 8, fontWeight: 'bold', color: '#333' },
  content: { flex: 1, paddingHorizontal: 20, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  
  // Section Header Styles
  sectionHeaderContainer: { marginTop: 15, marginBottom: 10 },
  sectionHeaderText: { fontSize: 16, fontWeight: 'bold', color: '#0056b3', backgroundColor: '#e3f2fd', paddingVertical: 5, paddingHorizontal: 15, borderRadius: 15, alignSelf: 'flex-start' },

  card: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  pillIcon: { width: 40, height: 40, marginRight: 15, borderRadius: 20, backgroundColor: '#eee' }, 
  medName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  medDetail: { fontSize: 12, color: '#666', marginTop: 2 },
  medTime: { fontSize: 14, color: '#0056b3', fontWeight: 'bold', marginTop: 4 },
  stockText: { fontSize: 10, color: '#888', marginTop: 2 },
  statusBtn: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#bbdefb' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { textAlign: 'center', color: '#666', fontSize: 16, fontWeight: 'bold' },
  emptySubText: { textAlign: 'center', color: '#999', fontSize: 14, marginTop: 5 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 60, height: 60, backgroundColor: '#0056b3', borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 }
});