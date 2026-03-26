import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, Alert, Image } from 'react-native'; 
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../constants/config'; 
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoseToQueue } from '../utils/offlineQueue';

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
      const state = await NetInfo.fetch();
      let rawData = [];

      if (state.isConnected) {
          const response = await axios.get(`${API_URL}/medications/${user.id}`);
          rawData = response.data;
          await AsyncStorage.setItem(`@cached_meds_${user.id}`, JSON.stringify(rawData));
      } else {
          const cachedData = await AsyncStorage.getItem(`@cached_meds_${user.id}`);
          if (cachedData) rawData = JSON.parse(cachedData);
      }

      const uniqueData = [];
      const map = new Map();

      for (const item of rawData) {
          const uniqueKey = item.schedule_id 
              ? `name_${item.custom_name}_time_${item.time_to_take}` 
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
            data: grouped[key].sort((a, b) => (a.time_to_take || '00:00:00').localeCompare(b.time_to_take || '00:00:00')) 
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
    const payload = { user_med_id: item.user_med_id, schedule_id: item.schedule_id, status: 'taken' };
    try {
        const state = await NetInfo.fetch();
        if (state.isConnected) {
            const response = await axios.post(`${API_URL}/log-dose`, payload);
            if (response.data.message === 'วันนี้คุณบันทึกยานี้ไปแล้ว') {
                Alert.alert("แจ้งเตือน", "ยานี้ถูกบันทึกไปแล้ว");
            } else if (response.data.alert) {
                 Alert.alert("แจ้งเตือน", response.data.alert);
            }
        } else {
            await addDoseToQueue(payload);
            Alert.alert("โหมดออฟไลน์", "บันทึกข้อมูลในเครื่องแล้ว");
        }
        fetchMedications(); 
    } catch (error) { 
        await addDoseToQueue(payload);
        fetchMedications();
    }
  };

  const renderItem = ({ item }) => {
    const isOutOfStock = item.current_quantity <= 0;
    const isTaken = item.is_taken === 1;
    const now = new Date();
    let [hours, minutes] = (item.time_to_take || "00:00").split(':').map(p => parseInt(p, 10));
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);
    const isNearTime = (scheduledTime - now) / (1000 * 60) <= 60; 

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Image 
            source={{ uri: item.image_url || 'https://cdn-icons-png.flaticon.com/512/822/822092.png' }} 
            style={styles.pillIcon} 
          />
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
                   style={[styles.statusBtn, { backgroundColor: isTaken ? '#4caf50' : (isOutOfStock ? '#e0e0e0' : '#e3f2fd'), borderColor: isTaken ? '#4caf50' : '#bbdefb' }]} 
                   onPress={() => handleTakePill(item)}
                   disabled={isTaken || isOutOfStock} 
               >
                   <Text style={{fontSize: 18, color: isTaken ? '#fff' : '#000'}}>{isTaken ? '✓' : (isOutOfStock ? '❌' : '⬜')}</Text>
               </TouchableOpacity>
           ) : (
               <View style={styles.waitBadge}>
                   <Ionicons name="time-outline" size={20} color="#999" /><Text style={styles.waitText}>รอ</Text>
               </View>
           )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {caregiver && (
        <View style={styles.banner}>
            <Text style={styles.bannerText}>👁️ กำลังดูข้อมูลของ {user.firstname}</Text>
        </View>
      )}
      
      {/* ✅ ปรับปรุงส่วน Header ให้มีปุ่มกลับ หาก caregiver เป็นคนเปิด */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {caregiver && (
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 15 }}>
                    <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>
            )}
            <View>
                <Text style={styles.greeting}>สวัสดี, คุณ{user.firstname}</Text>
                <Text style={styles.subGreeting}>{currentDate}</Text>
            </View>
        </View>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.navigate('AddSymptom', { user })}
        >
            <Ionicons name="thermometer" size={24} color="#d32f2f" />
            <Text style={styles.actionText}>บันทึกอาการป่วย</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
          <View>
              <Text style={styles.summaryTitle}>รายการยาของวัน</Text>
              <Text style={styles.summarySubTitle}>สถานะการทานยา</Text>
          </View>
          <View style={styles.countContainer}>
              <Text style={styles.countNumber}>{allMeds.length}</Text>
              <Text style={styles.countUnit}>รายการ</Text>
          </View>
      </View>

      <View style={styles.content}>
        <View style={styles.contentHeader}>
            <Text style={styles.sectionTitle}>ตารางเวลา</Text>
            <View style={styles.sortContainer}>
                <TouchableOpacity style={[styles.sortBtn, sortBy === 'time' && styles.sortBtnActive]} onPress={() => setSortBy('time')}>
                    <Text style={[styles.sortText, sortBy === 'time' && styles.sortTextActive]}>เวลา</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.sortBtn, sortBy === 'disease' && styles.sortBtnActive]} onPress={() => setSortBy('disease')}>
                    <Text style={[styles.sortText, sortBy === 'disease' && styles.sortTextActive]}>กลุ่มโรค</Text>
                </TouchableOpacity>
            </View>
        </View>
        
        {medSections.length === 0 ? (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>ไม่มีรายการยาสำหรับวันนี้</Text>
            </View>
        ) : (
            <SectionList
                sections={medSections}
                keyExtractor={(item) => item.schedule_id?.toString() || Math.random().toString()}
                renderItem={renderItem}
                renderSectionHeader={({ section: { title } }) => (
                    <View style={styles.sectionHeaderContainer}><Text style={styles.sectionHeaderText}>{title}</Text></View>
                )}
                contentContainerStyle={{ paddingBottom: 100 }}
                stickySectionHeadersEnabled={false} 
            />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  banner: { backgroundColor: '#ff9800', padding: 8, alignItems: 'center', paddingTop: 40 },
  bannerText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  header: { backgroundColor: '#0056b3', paddingTop: 55, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  subGreeting: { color: '#d1e3ff', fontSize: 14, marginTop: 4 },
  
  actionContainer: { marginTop: -20, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'center', marginBottom: 10 },
  actionButton: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 25, alignItems: 'center', elevation: 5 },
  actionText: { marginLeft: 8, fontWeight: 'bold', color: '#333' },

  summaryCard: { backgroundColor: '#0277bd', marginHorizontal: 20, marginTop: 10, borderRadius: 15, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 3 },
  summaryTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  summarySubTitle: { color: '#e1f5fe', fontSize: 12 },
  countContainer: { alignItems: 'flex-end' },
  countNumber: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  countUnit: { color: '#e1f5fe', fontSize: 10 },
  content: { flex: 1, paddingHorizontal: 20, marginTop: 15 },
  contentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  sortContainer: { flexDirection: 'row', backgroundColor: '#e0e0e0', borderRadius: 20, padding: 3 },
  sortBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 15 },
  sortBtnActive: { backgroundColor: '#fff', elevation: 2 },
  sortText: { fontSize: 12, color: '#666' },
  sortTextActive: { color: '#0056b3', fontWeight: 'bold' },
  sectionHeaderContainer: { marginTop: 15, marginBottom: 10 },
  sectionHeaderText: { fontSize: 14, fontWeight: 'bold', color: '#0056b3', backgroundColor: '#e3f2fd', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 10, alignSelf: 'flex-start' },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  pillIcon: { width: 45, height: 45, marginRight: 15, borderRadius: 22.5, backgroundColor: '#eee' }, 
  medName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  medDetail: { fontSize: 12, color: '#666', marginTop: 2 },
  medTime: { fontSize: 14, color: '#0056b3', fontWeight: 'bold', marginTop: 4 },
  statusContainer: { justifyContent: 'center', alignItems: 'center', width: 50 },
  statusBtn: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  waitBadge: { alignItems: 'center', opacity: 0.6 },
  waitText: { fontSize: 10, color: '#999' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { textAlign: 'center', color: '#999', fontSize: 14 }
});