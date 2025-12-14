import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, LayoutAnimation, Platform, UIManager, ActivityIndicator, ScrollView } from 'react-native';
import axios from 'axios';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// ⚠️ เช็ค IP
const API_URL = 'http://192.168.0.31:3000/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HistoryScreen({ route, navigation }) {
  const user = route.params?.user || { id: 0, firstname: 'Guest' };
  const caregiver = route.params?.caregiver;
  const isFocused = useIsFocused(); 

  const [activeTab, setActiveTab] = useState('meds'); // 'meds' | 'symptoms'
  
  // Data States
  const [medHistory, setMedHistory] = useState([]); // ข้อมูลยาแบบ Group เดือน -> วัน
  const [symptomLogs, setSymptomLogs] = useState([]); // ข้อมูลอาการ
  const [loading, setLoading] = useState(false);

  // Expand States
  const [expandedMonths, setExpandedMonths] = useState({}); // { '2025-12': true }
  const [expandedDays, setExpandedDays] = useState({});     // { '2025-12-14': true }

  useEffect(() => {
    if (isFocused && user.id !== 0) {
        fetchData();
    }
  }, [isFocused]);

  const fetchData = async () => {
      setLoading(true);
      try {
          await Promise.all([fetchMedHistory(), fetchSymptoms()]);
      } catch (error) {
          console.error(error);
      } finally {
          setLoading(false);
      }
  };

  // --- 1. Fetch & Group Medications (Month -> Day -> Items) ---
  const fetchMedHistory = async () => {
      try {
          const response = await axios.get(`${API_URL}/history/${user.id}`);
          const rawData = response.data;

          // Group by Month -> Day
          const groups = {};
          
          rawData.forEach(item => {
              const date = new Date(item.taken_at);
              const year = date.getFullYear();
              const month = date.getMonth(); 
              const dayStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
              const monthKey = `${year}-${month}`; // Key for Month Group

              // 1. Level Month
              if (!groups[monthKey]) {
                  groups[monthKey] = {
                      id: monthKey,
                      dateObj: date,
                      days: {}
                  };
              }

              // 2. Level Day
              if (!groups[monthKey].days[dayStr]) {
                  groups[monthKey].days[dayStr] = {
                      date: dayStr,
                      items: [],
                      summary: { total: 0, taken: 0 }
                  };
              }

              // 3. Add Item
              groups[monthKey].days[dayStr].items.push(item);
              
              // Calc Stats
              groups[monthKey].days[dayStr].summary.total += 1;
              if (item.status === 'taken') groups[monthKey].days[dayStr].summary.taken += 1;
          });

          // Convert Object to Array & Sort
          const sortedMonths = Object.values(groups).map(monthGroup => {
              const sortedDays = Object.values(monthGroup.days).sort((a, b) => new Date(b.date) - new Date(a.date));
              return { ...monthGroup, days: sortedDays };
          }).sort((a, b) => b.dateObj - a.dateObj);

          setMedHistory(sortedMonths);
          
          // Auto expand first month
          if (sortedMonths.length > 0) {
              setExpandedMonths(prev => ({ ...prev, [sortedMonths[0].id]: true }));
          }

      } catch (error) { console.log(error); }
  };

  // --- 2. Fetch Symptoms ---
  const fetchSymptoms = async () => {
      try {
          const response = await axios.get(`${API_URL}/symptoms/${user.id}`);
          setSymptomLogs(response.data);
      } catch (error) { console.log(error); }
  };

  // --- Logic Helpers ---
  const toggleMonth = (monthId) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedMonths(prev => ({ ...prev, [monthId]: !prev[monthId] }));
  };

  const toggleDay = (dayId) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedDays(prev => ({ ...prev, [dayId]: !prev[dayId] }));
  };

  const getStatusInfo = (item) => {
      if (item.status === 'skipped') return { color: '#ef5350', label: 'ข้าม/ลืม', barColor: '#ffcdd2' };
      
      const takenTime = new Date(item.taken_at);
      const [h, m] = item.time_to_take.split(':');
      const scheduledTime = new Date(item.taken_at);
      scheduledTime.setHours(h, m, 0);

      const diffMinutes = (takenTime - scheduledTime) / (1000 * 60);
      if (diffMinutes > 30) return { color: '#ff9800', label: `ช้า ${Math.round(diffMinutes)} นาที`, barColor: '#ffe0b2' };
      
      return { color: '#4caf50', label: 'ตรงเวลา', barColor: '#c8e6c9' };
  };

  const getSeverityInfo = (level) => {
      if (level <= 2) return { color: '#4caf50', text: 'เล็กน้อย' };
      if (level === 3) return { color: '#ff9800', text: 'ปานกลาง' };
      return { color: '#f44336', text: 'รุนแรง' };
  };

  // --- PDF Generator ---
  // --- PDF Generator (ฉบับปรับปรุง: รวมข้อมูล + หัวข้อเดือนใหญ่) ---
  const generatePDF = async () => {
    try {
        // 1. รวบรวมข้อมูลทั้งหมด (ยา + อาการ) เพื่อมาจัดเรียงใหม่
        let allItems = [];

        // 1.1 ดึงข้อมูลยาจาก State ที่มีอยู่
        medHistory.forEach(month => {
            month.days.forEach(day => {
                day.items.forEach(item => {
                    allItems.push({
                        ...item,
                        type: 'med',
                        timestamp: new Date(item.taken_at)
                    });
                });
            });
        });

        // 1.2 ดึงข้อมูลอาการ
        symptomLogs.forEach(sym => {
            allItems.push({
                ...sym,
                type: 'symptom',
                timestamp: new Date(sym.log_timestamp)
            });
        });

        // 1.3 เรียงลำดับทั้งหมดตามเวลา (ใหม่ -> เก่า)
        allItems.sort((a, b) => b.timestamp - a.timestamp);

        // 2. สร้าง HTML Rows
        let tableRows = '';
        let currentMonthKey = '';
        let currentDayKey = '';

        allItems.forEach(item => {
            const date = item.timestamp;
            const monthKey = date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
            const dayKey = date.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

            // 2.1 ตรวจสอบว่าขึ้นเดือนใหม่หรือยัง? ถ้าใช่ ให้แทรกหัวข้อเดือนใหญ่ๆ
            if (monthKey !== currentMonthKey) {
                currentMonthKey = monthKey;
                // ✅✅✅ หัวข้อเดือนแบบใหญ่ กลางหน้าจอ ✅✅✅
                tableRows += `
                    <tr>
                        <td colspan="4" style="padding: 20px 0 10px 0; border: none;">
                            <div style="background-color: #0056b3; color: white; padding: 10px; text-align: center; font-size: 18px; font-weight: bold; border-radius: 8px;">
                                เดือน ${monthKey}
                            </div>
                        </td>
                    </tr>
                    <tr style="background-color: #f5f5f5; font-weight: bold;">
                        <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">เวลา</th>
                        <th style="padding: 8px; border: 1px solid #ddd; width: 10%;">ประเภท</th>
                        <th style="padding: 8px; border: 1px solid #ddd; width: 45%;">รายละเอียด</th>
                        <th style="padding: 8px; border: 1px solid #ddd; width: 30%;">สถานะ</th>
                    </tr>
                `;
                currentDayKey = ''; // รีเซ็ตวันเมื่อขึ้นเดือนใหม่
            }

            // 2.2 ตรวจสอบว่าขึ้นวันใหม่หรือยัง?
            if (dayKey !== currentDayKey) {
                currentDayKey = dayKey;
                tableRows += `
                    <tr style="background-color: #e3f2fd;">
                        <td colspan="4" style="font-weight: bold; padding: 8px 15px; border: 1px solid #ddd;">
                            📅 ${dayKey}
                        </td>
                    </tr>
                `;
            }

            // 2.3 สร้างแถวรายการ
            const time = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute:'2-digit'});
            let icon, name, detail, statusColor, statusText, rowBg;

            if (item.type === 'med') {
                icon = '💊';
                name = item.custom_name;
                detail = `${item.dosage_amount} ${item.dosage_unit}`;
                statusText = item.status === 'taken' ? 'ทานแล้ว' : 'ข้าม/ลืม';
                statusColor = item.status === 'taken' ? '#2e7d32' : '#c62828';
                rowBg = '#ffffff';
            } else {
                icon = '🤒';
                name = `<span style="color: #ef6c00;">อาการ: ${item.symptom_name}</span>`;
                detail = item.description || '-';
                statusText = `ระดับ ${item.severity}`;
                statusColor = '#ef6c00';
                rowBg = '#fff8e1'; // สีพื้นหลังอ่อนๆ สำหรับอาการ
            }

            tableRows += `
                <tr style="background-color: ${rowBg};">
                    <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${time}</td>
                    <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${icon}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">
                        <strong>${name}</strong><br/>
                        <span style="font-size: 12px; color: #666;">${detail}</span>
                    </td>
                    <td style="text-align: center; border: 1px solid #ddd; padding: 8px; color: ${statusColor}; font-weight: bold;">
                        ${statusText}
                    </td>
                </tr>
            `;
        });

        // 3. ประกอบร่าง HTML
        const htmlContent = `
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
                    h1 { color: #0056b3; text-align: center; margin-bottom: 5px; }
                    .subtitle { text-align: center; color: #666; font-size: 14px; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
                </style>
            </head>
            <body>
                <h1>รายงานสุขภาพ</h1>
                <p class="subtitle">
                    ผู้ป่วย: <strong>คุณ${user.firstname} ${user.lastname || ''}</strong> <br/>
                    ข้อมูล ณ วันที่ ${new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}
                </p>
                
                <table>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri);

    } catch (error) { 
        console.log(error);
        Alert.alert('Error', 'ไม่สามารถสร้างไฟล์ PDF ได้'); 
    }
  };
  // --- Render Components ---

  // 1. รายการยาแต่ละเม็ด (ในสุด)
  const renderMedItem = (item, index) => {
      const status = getStatusInfo(item);
      const timeStr = new Date(item.taken_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute:'2-digit'});
      return (
          <View key={index} style={styles.medRow}>
              <View style={styles.medTimeBox}><Text style={styles.medTimeText}>{timeStr}</Text></View>
              <View style={styles.medInfo}>
                  <Text style={styles.medName}>{item.custom_name}</Text>
                  <View style={styles.statusRow}>
                      <View style={[styles.statusBar, { backgroundColor: status.color }]} />
                      <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
              </View>
          </View>
      );
  };

  // 2. กลุ่มวัน (Day Group)
  const renderDayGroup = (day) => {
      const isExpanded = expandedDays[day.date];
      const dateLabel = new Date(day.date).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric' });
      const { taken, total } = day.summary;
      
      return (
          <View key={day.date} style={styles.dayGroupContainer}>
              <TouchableOpacity onPress={() => toggleDay(day.date)} style={styles.dayHeader}>
                  <View>
                      <Text style={styles.dayDateText}>{dateLabel}</Text>
                      <View style={styles.progressBarBg}>
                          <View style={[styles.progressBarFill, { width: `${(taken / total) * 100}%` }]} />
                      </View>
                  </View>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={styles.dayStats}>{taken}/{total}</Text>
                      <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color="#666" />
                  </View>
              </TouchableOpacity>
              
              {isExpanded && (
                  <View style={styles.dayContent}>
                      {day.items.sort((a,b) => new Date(a.taken_at) - new Date(b.taken_at)).map((item, idx) => renderMedItem(item, idx))}
                  </View>
              )}
          </View>
      );
  };

  // 3. กลุ่มเดือน (Month Group) - Wrapper นอกสุดของแท็บยา
  const renderMonthGroup = ({ item }) => {
      const isExpanded = expandedMonths[item.id];
      const monthLabel = item.dateObj.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

      return (
          <View style={styles.monthContainer}>
              <TouchableOpacity onPress={() => toggleMonth(item.id)} style={[styles.monthHeader, isExpanded && styles.monthHeaderActive]}>
                  <Text style={[styles.monthHeaderText, isExpanded && {color: '#fff'}]}>{monthLabel}</Text>
                  {/* ✅✅✅ ปรับไอคอนเป็นลูกศรตามที่ขอ ✅✅✅ */}
                  <Ionicons 
                    name={isExpanded ? "chevron-down" : "chevron-forward"} 
                    size={24} 
                    color={isExpanded ? "#fff" : "#0056b3"} 
                  />
              </TouchableOpacity>
              
              {isExpanded && (
                  <View style={styles.monthContent}>
                      {item.days.map(day => renderDayGroup(day))}
                  </View>
              )}
          </View>
      );
  };

  // 4. รายการอาการ (สำหรับ Tab อาการ)
  const renderSymptomItem = ({ item }) => (
    <View style={styles.logItem}>
        <View style={styles.timeContainer}>
            <Text style={styles.dateText}>{new Date(item.log_timestamp).toLocaleDateString('th-TH', {day:'numeric', month:'short'})}</Text>
            <Text style={styles.timeText}>{new Date(item.log_timestamp).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}</Text>
        </View>
        <View style={styles.infoContainer}>
            <Text style={styles.title}>{item.symptom_name}</Text>
            <Text style={styles.subtitle}>{item.description}</Text>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: item.severity > 3 ? '#f44336' : '#4caf50' }]}>
            <Text style={styles.severityText}>ระดับ {item.severity}</Text>
        </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Banner */}
      {caregiver && (
        <TouchableOpacity
            onPress={() => navigation.navigate('CaregiverHome', { caregiver })}
            style={styles.banner}
        >
            <Text style={styles.bannerText}>👁️ คุณ{caregiver.firstname} กำลังดูประวัติของ {user.firstname}</Text>
        </TouchableOpacity>
      )}

      {/* Header */}
      <View style={[styles.header, caregiver && { paddingTop: 15 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ประวัติสุขภาพ</Text>
          <TouchableOpacity onPress={generatePDF}>
            <Ionicons name="document-text-outline" size={24} color="#0056b3" />
          </TouchableOpacity>
      </View>
      
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'meds' && styles.activeTab]} onPress={() => setActiveTab('meds')}>
            <Text style={[styles.tabText, activeTab === 'meds' && styles.activeTabText]}>💊 การทานยา</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'symptoms' && styles.activeTab]} onPress={() => setActiveTab('symptoms')}>
            <Text style={[styles.tabText, activeTab === 'symptoms' && styles.activeTabText]}>🤒 อาการป่วย</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? <ActivityIndicator size="large" color="#0056b3" style={{marginTop: 50}} /> : (
            activeTab === 'meds' ? (
                <FlatList 
                    data={medHistory} 
                    keyExtractor={item => item.id} 
                    renderItem={renderMonthGroup} 
                    contentContainerStyle={{paddingBottom: 20}}
                    ListEmptyComponent={<Text style={styles.emptyText}>ไม่มีประวัติการทานยา</Text>} 
                />
            ) : (
                <FlatList 
                    data={symptomLogs} 
                    keyExtractor={(item, index) => index.toString()} 
                    renderItem={renderSymptomItem} 
                    contentContainerStyle={{paddingBottom: 20}}
                    ListEmptyComponent={<Text style={styles.emptyText}>ไม่มีประวัติอาการป่วย</Text>} 
                />
            )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  banner: { backgroundColor: '#ff9800', padding: 10, alignItems: 'center', paddingTop: 40 },
  bannerText: { color: '#fff', fontWeight: 'bold' },
  header: { 
      paddingTop: 50, paddingBottom: 15, paddingHorizontal: 15, 
      backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  
  tabContainer: { flexDirection: 'row', margin: 15, backgroundColor: '#e0e0e0', borderRadius: 10, padding: 4 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#fff', elevation: 2 },
  tabText: { fontWeight: 'bold', color: '#666' },
  activeTabText: { color: '#0056b3' },
  content: { flex: 1, paddingHorizontal: 15 },

  // --- Month Styles ---
  monthContainer: { marginBottom: 15, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 2 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  monthHeaderActive: { backgroundColor: '#0056b3' },
  monthHeaderText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  monthContent: { backgroundColor: '#f9f9f9', padding: 10 },

  // --- Day Styles ---
  dayGroupContainer: { backgroundColor: '#fff', borderRadius: 8, marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#fff' },
  dayDateText: { fontSize: 15, fontWeight: 'bold', color: '#555', marginBottom: 5 },
  dayStats: { fontSize: 14, fontWeight: 'bold', color: '#0056b3', marginRight: 10 },
  dayContent: { backgroundColor: '#fafafa', borderTopWidth: 1, borderTopColor: '#f0f0f0', padding: 10 },
  
  progressBarBg: { height: 4, width: 100, backgroundColor: '#eee', borderRadius: 2 },
  progressBarFill: { height: 4, backgroundColor: '#4caf50', borderRadius: 2 },

  // --- Med Item Styles ---
  medRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'center' },
  medTimeBox: { width: 60, alignItems: 'center', marginRight: 10 },
  medTimeText: { fontSize: 14, fontWeight: 'bold', color: '#666' },
  medInfo: { flex: 1 },
  medName: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusBar: { height: 6, width: 50, borderRadius: 3, marginRight: 8 },
  statusText: { fontSize: 12, fontWeight: 'bold' },

  // --- Symptom Styles ---
  logItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 1 },
  timeContainer: { marginRight: 15, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#eee', paddingRight: 15, width: 70 },
  dateText: { fontSize: 12, color: '#666' },
  timeText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  infoContainer: { flex: 1 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 12, color: '#888' },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  severityText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' }
});