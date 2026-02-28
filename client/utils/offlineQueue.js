import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { API_URL } from '../constants/config';
import { Alert } from 'react-native';

const QUEUE_KEY = '@offline_dose_queue';
const SYMPTOM_QUEUE_KEY = '@offline_symptom_queue';

// 1. ฟังก์ชันเพิ่มข้อมูลการกินยาเข้าคิว (เมื่อออฟไลน์)
export const addDoseToQueue = async (doseData) => {
  try {
    const currentQueue = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = currentQueue ? JSON.parse(currentQueue) : [];
    queue.push(doseData);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log("Offline dose saved to queue!");
  } catch (error) {
    console.error('Error adding to queue:', error);
  }
};
export const addSymptomToQueue = async (symptomData) => {
  try {
    const currentQueue = await AsyncStorage.getItem(SYMPTOM_QUEUE_KEY);
    const queue = currentQueue ? JSON.parse(currentQueue) : [];
    queue.push(symptomData);
    await AsyncStorage.setItem(SYMPTOM_QUEUE_KEY, JSON.stringify(queue));
    console.log("Offline symptom saved to queue!");
  } catch (error) {
    console.error('Error adding symptom to queue:', error);
  }
};
// 2. ฟังก์ชันซิงค์ข้อมูลกลับไปที่ Server (เมื่อเน็ตมา)
export const syncOfflineQueue = async () => {
  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return; // ไม่มีเน็ต ไม่ต้องทำอะไร

    const currentQueue = await AsyncStorage.getItem(QUEUE_KEY);
    if (!currentQueue) return;

    const queue = JSON.parse(currentQueue);
    if (queue.length === 0) return;

    console.log(`Syncing ${queue.length} offline items to server...`);

    const failedItems = [];
    for (const item of queue) {
      try {
        await axios.post(`${API_URL}/log-dose`, item);
      } catch (err) {
        console.error('Sync failed for item', item, err);
        failedItems.push(item); // ถ้าเซิร์ฟเวอร์มีปัญหา ให้เก็บไว้คิวรอบหน้า
      }
    }

    // อัปเดตคิว (เหลือแค่ตัวที่ยังส่งไม่ผ่าน หรือลบทิ้งถ้าผ่านหมด)
    if (failedItems.length > 0) {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failedItems));
      // ✅ เพิ่ม Debug แจ้งเตือนกรณีส่งไม่ครบ
      Alert.alert("⚠️ ซิงค์ข้อมูลไม่สมบูรณ์", "มีประวัติบางรายการยังส่งไม่สำเร็จ ระบบจะพยายามใหม่ภายหลัง");
    } else {
      await AsyncStorage.removeItem(QUEUE_KEY);
      console.log("Offline sync completed!");
      
      // ✅ เพิ่ม Debug แจ้งเตือนกรณีซิงค์ผ่านหมด
      Alert.alert(
          "✅ ซิงค์ข้อมูลสำเร็จ", 
          `ส่งประวัติการกินยาที่ค้างอยู่จำนวน ${queue.length} รายการ ขึ้นเซิร์ฟเวอร์เรียบร้อยแล้ว!`
      );
    }
  // ==========================================
    // ส่วนที่ 2: ซิงค์อาการป่วยที่ค้างไว้
    // ==========================================
    const currentSymptomQueue = await AsyncStorage.getItem(SYMPTOM_QUEUE_KEY);
    if (currentSymptomQueue) {
        const sympQueue = JSON.parse(currentSymptomQueue);
        if (sympQueue.length > 0) {
            console.log(`Syncing ${sympQueue.length} offline symptoms to server...`);
            const failedSympItems = [];
            
            for (const item of sympQueue) {
              try {
                await axios.post(`${API_URL}/symptoms`, item);
              } catch (err) {
                console.error('Sync failed for symptom', item, err);
                failedSympItems.push(item);
              }
            }

            if (failedSympItems.length > 0) {
              await AsyncStorage.setItem(SYMPTOM_QUEUE_KEY, JSON.stringify(failedSympItems));
            } else {
              await AsyncStorage.removeItem(SYMPTOM_QUEUE_KEY);
              Alert.alert("✅ ซิงค์ข้อมูลสำเร็จ", "ส่งประวัติอาการป่วยที่ค้างไว้ขึ้นเซิร์ฟเวอร์เรียบร้อยแล้ว");
            }
        }
    }
  } catch (error) {
    console.error('Error syncing queue:', error);
  }
};
