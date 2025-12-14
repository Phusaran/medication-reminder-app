import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, Alert, Image } from 'react-native'; 
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../constants/config'; 

export default function HomeScreen({ route, navigation }) {
  const user = route.params?.user || { id: 0, firstname: 'Guest' }; 
  const caregiver = route.params?.caregiver;
  
  const [allMeds, setAllMeds] = useState([]); 
  const [medSections, setMedSections] = useState([]); 
  const [sortBy, setSortBy] = useState('time'); 
  
  const currentDate = new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  useFocusEffect(
    useCallback(() => {
        if (user.id !== 0) fetchMedications();
    }, [user.id])
  );

  const fetchMedications = async () => {
    try {
      const response = await axios.get(`${API_URL}/medications/${user.id}`);
      const rawData = response.data;

      // ✅ กรองข้อมูลซ้ำแบบฉลาด (Smart Deduplicate) - เวอร์ชันอัปเกรด
      const uniqueData = [];
      const map = new Map();

      for (const item of rawData) {
          // 🛠️ แก้ไขตรงนี้: เปลี่ยนจากใช้ user_med_id เป็น custom_name
          // เพื่อให้ยาชื่อเดียวกัน ที่เวลาเดียวกัน ถูกนับเป็นอันเดียว (แม้จะมาจากคนละรายการใน DB)
          const uniqueKey = item.schedule_id 
              ? `name_${item.custom_name}_time_${item.time_to_take}`  // กรองจาก ชื่อ + เวลา
              : `name_${item.custom_name}`;                            
          
          if (!map.has(uniqueKey)) {
              map.set(uniqueKey, true);
              uniqueData.push(item);
          }
      }

      setAllMeds(uniqueData);

    } catch (error) { console.log("Fetch Error:", error); }
  };

  useEffect(() => {
    if (allMeds.length === 0) {
        setMedSections([]);
        return;
    }

    let sections = [];

    if (sortBy === 'disease') {
        const grouped = allMeds.reduce((acc, item) => {
            const groupName = item.disease_group || 'ยาอื่นๆ'; 
            if (!acc[groupName]) acc[groupName] = [];
            acc[groupName].push(item);
            return acc;
        }, {});

        sections = Object.keys(grouped).map(key => ({
            title: key,
            data: grouped[key].sort((a, b) => {
                const timeA = a.time_to_take || '00:00:00';
                const timeB = b.time_to_take || '00:00:00';
                return timeA.localeCompare(timeB);
            }) 
        })).sort((a, b) => a.title.localeCompare(b.title)); 

    } else {
        const grouped = allMeds.reduce((acc, item) => {
            const timeKey = item.time_to_take ? item.time_to_take.substring(0, 5) : 'ไม่ระบุเวลา';
            if (!acc[timeKey]) acc[timeKey] = [];
            acc[timeKey].push(item);
            return acc;
        }, {});

        sections = Object.keys(grouped).sort().map(key => ({
            title: `${key} น.`,
            data: grouped[key] 
        }));
    }

    setMedSections(sections);

  }, [allMeds, sortBy]);

  const handleTakePill = async (item) => {
    try {
        const response = await axios.post(`${API_URL}/log-dose`, {
           user_med_id: item.user_med_id,
           schedule_id: item.schedule_id,
           status: 'taken'
       });
       
       if (response.status === 200) {
           if (response.data.alert) Alert.alert("แจ้งเตือน", response.data.alert);
           fetchMedications(); 
       }
    } catch (error) { 
        Alert.alert("ผิดพลาด", "ไม่สามารถบันทึกได้"); 
        console.error(error);
    }
  };

  const handleLogout = () => navigation.replace('Login');

  const renderItem = ({ item }) => {
    const isOutOfStock = item.current_quantity <= 0;
    const isTaken = item.is_taken === 1;

    const now = new Date();
    const [hours, minutes] = item.time_to_take ? item.time_to_take.split(':') : ['00', '00'];
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    const diffMs = scheduledTime - now;
    const diffMins = diffMs / (1000 * 60);
    const isNearTime = diffMins <= 60; 

    return (
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
              
              {isOutOfStock && <Text style={{color: 'red', fontSize: 12, fontWeight: 'bold'}}>⚠️ ยาหมด!</Text>}
              {isTaken && <Text style={{color: 'green', fontSize: 12, fontWeight: 'bold'}}>✅ เรียบร้อยแล้ว</Text>}
          </View>
        </View>
        
        <View style={styles.statusContainer}>
           {isNearTime || isTaken || isOutOfStock ? (
               <TouchableOpacity 
                   style={[
                       styles.statusBtn, 
                       { 
                           backgroundColor: isTaken ? '#4caf50' : (isOutOfStock ? '#e0e0e0' : '#e3f2fd'),
                           borderColor: isTaken ? '#4caf50' : '#bbdefb'
                       }
                   ]} 
                   onPress={() => handleTakePill(item)}
                   disabled={isTaken || isOutOfStock} 
               >
                   <Text style={{fontSize: 18, color: isTaken ? '#fff' : '#000'}}>
                       {isTaken ? '✓' : (isOutOfStock ? '❌' : '⬜')}
                   </Text>
               </TouchableOpacity>
           ) : (
               <View style={styles.waitBadge}>
                   <Ionicons name="time-outline" size={20} color="#999" />
                   <Text style={styles.waitText}>รอ</Text>
               </View>
           )}
        </View>
      </View>
    );
  };

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
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>ออก</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('AddSymptom', { user })}>
            <Ionicons name="thermometer" size={24} color="#d32f2f" />
            <Text style={styles.actionText}>บันทึกอาการป่วย</Text>
        </TouchableOpacity>
      </View>

      {/* ✅✅✅ เพิ่มส่วนสรุปจำนวนยา ตรงนี้ ✅✅✅ */}
      <View style={styles.summaryCard}>
          <View>
              <Text style={styles.summaryTitle}>รายการยา</Text>
              <Text style={styles.summarySubTitle}>วันนี้</Text>
          </View>
          <View style={styles.countContainer}>
              {/* ใช้ allMeds.length เพื่อนับรายการยาทั้งหมดของวันนี้ */}
              <Text style={styles.countNumber}>{allMeds.length}</Text>
              <Text style={styles.countUnit}>รายการ</Text>
          </View>
      </View>
      {/* ------------------------------------------- */}

      <View style={styles.content}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
            <Text style={styles.sectionTitle}>ตารางเวลา</Text>
            
            <View style={styles.sortContainer}>
                <TouchableOpacity 
                    style={[styles.sortBtn, sortBy === 'time' && styles.sortBtnActive]} 
                    onPress={() => setSortBy('time')}
                >
                    <Text style={[styles.sortText, sortBy === 'time' && styles.sortTextActive]}>เวลา</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.sortBtn, sortBy === 'disease' && styles.sortBtnActive]} 
                    onPress={() => setSortBy('disease')}
                >
                    <Text style={[styles.sortText, sortBy === 'disease' && styles.sortTextActive]}>กลุ่มโรค</Text>
                </TouchableOpacity>
            </View>
        </View>
        
        {medSections.length === 0 ? (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>ไม่มีรายการยาสำหรับวันนี้</Text>
                <Text style={styles.emptySubText}>กดปุ่ม + ด้านล่างเพื่อเพิ่มยา</Text>
            </View>
        ) : (
            <SectionList
                sections={medSections}
                keyExtractor={(item) => item.schedule_id ? item.schedule_id.toString() : Math.random().toString()}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                contentContainerStyle={{ paddingBottom: 80 }}
                stickySectionHeadersEnabled={false} 
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
  
  actionContainer: { marginTop: -20, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'center', marginBottom: 10 },
  actionButton: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 25, alignItems: 'center', elevation: 5 },
  actionText: { marginLeft: 8, fontWeight: 'bold', color: '#333' },

  // ✅ Styles สำหรับกล่องสรุป (Summary Card)
  summaryCard: {
    backgroundColor: '#0277bd', // สีฟ้าเข้มขึ้นนิดนึงให้ต่างจาก header
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 5,
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
  },
  summaryTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  summarySubTitle: { color: '#e1f5fe', fontSize: 12 },
  countContainer: { alignItems: 'flex-end' },
  countNumber: { color: '#fff', fontSize: 28, fontWeight: 'bold', lineHeight: 32 },
  countUnit: { color: '#e1f5fe', fontSize: 10 },

  content: { flex: 1, paddingHorizontal: 20, marginTop: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  
  sortContainer: { flexDirection: 'row', backgroundColor: '#e0e0e0', borderRadius: 20, padding: 3 },
  sortBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 15 },
  sortBtnActive: { backgroundColor: '#fff', elevation: 2 },
  sortText: { fontSize: 12, color: '#666' },
  sortTextActive: { color: '#0056b3', fontWeight: 'bold' },

  sectionHeaderContainer: { marginTop: 15, marginBottom: 10 },
  sectionHeaderText: { fontSize: 16, fontWeight: 'bold', color: '#0056b3', backgroundColor: '#e3f2fd', paddingVertical: 5, paddingHorizontal: 15, borderRadius: 15, alignSelf: 'flex-start' },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  pillIcon: { width: 40, height: 40, marginRight: 15, borderRadius: 20, backgroundColor: '#eee' }, 
  medName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  medDetail: { fontSize: 12, color: '#666', marginTop: 2 },
  medTime: { fontSize: 14, color: '#0056b3', fontWeight: 'bold', marginTop: 4 },
  statusContainer: { justifyContent: 'center', alignItems: 'center', width: 50 },
  statusBtn: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  waitBadge: { alignItems: 'center', opacity: 0.6 },
  waitText: { fontSize: 10, color: '#999' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { textAlign: 'center', color: '#666', fontSize: 16, fontWeight: 'bold' },
  emptySubText: { textAlign: 'center', color: '#999', fontSize: 14, marginTop: 5 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 60, height: 60, backgroundColor: '#0056b3', borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 }
});