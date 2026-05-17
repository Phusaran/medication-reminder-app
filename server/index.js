require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 🗄️ ตั้งค่า Database
// ==========================================
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'medication_reminder'
});

db.getConnection()
    .then(() => console.log('✅ Connected to database: medication_reminder'))
    .catch((err) => console.error('❌ Database connection failed:', err.message));

// ==========================================
// ⚙️ ตั้งค่าระบบอัปโหลด (Multer) & โฟลเดอร์
// ==========================================
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// ==========================================
// 🔔 ระบบแจ้งเตือน (Notification Helper) 
// ==========================================
// ค้นหาผู้ดูแลและส่งแจ้งเตือนไปที่พวกเขาแทนผู้ป่วย
const notifyCaregiver = async (userId, message) => {
    try {
        const [caregivers] = await db.query(`
            SELECT cg.caregiver_id, cg.email, cg.device_token 
            FROM Caring c
            JOIN Caregiver cg ON c.caregiver_id = cg.caregiver_id
            WHERE c.user_id = ? AND c.status = 'active'
        `, [userId]);

        if (caregivers.length > 0) {
            for (let cg of caregivers) {
                console.log(`🔔 [NOTIFY CAREGIVER] ส่งแจ้งเตือนไปที่ ${cg.email} (Token: ${cg.device_token})`);

                // หากผู้ดูแลมี Token ให้ส่งคำสั่ง Push ไปที่ Expo
                if (cg.device_token) {
                    await fetch('https://exp.host/--/api/v2/push/send', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            to: cg.device_token,
                            sound: 'default',
                            title: 'แจ้งเตือนจากผู้ป่วย ⚠️',
                            body: message,
                            priority: 'high'
                        })
                    });
                }
            }
        }
    } catch (error) {
        console.error("❌ Error sending notification to caregiver:", error);
    }
};

// ==========================================
// ⏱️ Auto Check & Update Tasks
// ==========================================
const autoMarkMissedMedications = async (userId) => {
    try {
        // ดึงรายการยาที่เลยกำหนด 60 นาที (ข้ามมื้อนี้) และยังไม่มี Log
        const [missingMeds] = await db.query(`
            SELECT s.schedule_id, um.custom_name, um.user_id
            FROM Schedule s
            JOIN User_Medication um ON s.user_med_id = um.user_med_id
            LEFT JOIN Medication_Log ml 
                ON s.schedule_id = ml.schedule_id 
                AND DATE(ml.taken_at) = CURDATE()
            WHERE um.user_id = ?
            AND (um.is_deleted = 0 OR um.is_deleted IS NULL)
            AND ml.med_log_id IS NULL  
            AND CURTIME() >= ADDTIME(s.time_to_take, '01:00:00')
        `, [userId]);

        // ถ้าพบยาที่ขาด ให้ส่งแจ้งเตือนผู้ดูแล และอัปเดตตารางเป็น missed
        if (missingMeds.length > 0) {
            for (let med of missingMeds) {
                // แจ้งเตือนผู้ดูแล
                await notifyCaregiver(userId, `⚠️ ผู้ป่วยเลยเวลาทานยา: ${med.custom_name} เกิน 60 นาที (ปรับเป็นข้ามมื้อยา)`);

                // บันทึกสถานะ missed
                await db.query(`
                    INSERT INTO Medication_Log (schedule_id, status, taken_at)
                    VALUES (?, 'missed', NOW())
                `, [med.schedule_id]);
            }
        }
    } catch (error) {
        console.error("Error auto-marking missed meds:", error);
    }
};

const autoDeactivateExpiredMedications = async (userId) => {
    try {
        const sql = `
            UPDATE User_Medication 
            SET is_active = 0 
            WHERE user_id = ? 
            AND is_active = 1 
            AND end_date < CURDATE()
        `;
        await db.query(sql, [userId]);
    } catch (error) {
        console.error("Error auto-deactivating expired meds:", error);
    }
};

// ==========================================
// 📸 API อัปโหลดรูปภาพ
// ==========================================
app.post('/api/upload', upload.single('profileImage'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'กรุณาเลือกรูปภาพ' });
    }
    const protocol = req.protocol;
    const host = req.get('host');
    const fullUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    res.json({ url: fullUrl });
});

// ==========================================
// 1. ส่วน User (Authen)
// ==========================================

app.post('/api/register', async (req, res) => {
    // ❇️ รับค่า gender, age, weight, height เพิ่มเติม
    const { email, password, firstname, lastname, gender, age, weight, height } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'email และ password จำเป็นต้องระบุ' });
    }
    try {
        const [existingUser] = await db.query('SELECT * FROM user WHERE email = ?', [email]);
        if (existingUser.length > 0) return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();

        // ❇️ บันทึกข้อมูลสุขภาพลง Database ด้วย
        await db.query(
            `INSERT INTO user 
            (email, password, firstname, lastname, invite_code, gender, age, weight, height) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                email,
                hashedPassword,
                firstname,
                lastname,
                invite_code,
                gender || null,
                age || null,
                weight || null,
                height || null
            ]
        );
        res.status(201).json({ message: 'สมัครสมาชิกเรียบร้อยแล้ว' });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'email และ password จำเป็นต้องระบุ' });
    }
    try {
        const [rows] = await db.query('SELECT * FROM user WHERE email = ?', [email]);
        if (rows.length === 0) return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });

        res.json(user);
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการล็อกอิน' });
    }
});

// ❇️ อัปเดตการรับค่า เพศ (gender), อายุ (age), น้ำหนัก (weight)
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { firstname, lastname, password, profile_image, gender, age, weight, height } = req.body;

    if (!firstname || !lastname) {
        return res.status(400).json({ message: 'firstname และ lastname จำเป็นต้องระบุ' });
    }

    try {
        let query = 'UPDATE user SET firstname = ?, lastname = ?';
        let params = [firstname, lastname];

        if (profile_image) { query += ', profile_image = ?'; params.push(profile_image); }
        if (gender) { query += ', gender = ?'; params.push(gender); }
        if (age) { query += ', age = ?'; params.push(age); }
        if (weight) { query += ', weight = ?'; params.push(weight); }
        if (height) { query += ', height = ?'; params.push(height); } // ❇️ เพิ่มคัดกรองส่วนสูงตรงนี้

        query += ' WHERE user_id = ?';
        params.push(id);

        await db.query(query, params);
        const [updatedUsers] = await db.query('SELECT * FROM user WHERE user_id = ?', [id]);
        res.json(updatedUsers[0]);

    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ message: 'Error updating profile' });
    }
});

// ==========================================
// 2. ส่วนยา (Medications)
// ==========================================

// ดึงรายการยาของ User ❇️ เพิ่ม m.trade_name, m.mg
app.get('/api/medications/:userId', async (req, res) => {
    const { userId } = req.params;
    const { all } = req.query;

    try {
        await autoMarkMissedMedications(userId);
        await autoDeactivateExpiredMedications(userId);
        let sql = `
            SELECT 
                m.user_med_id, m.custom_name, m.trade_name, m.mg, m.instruction, m.dosage_unit, m.disease_group,
                m.custom_image AS image_url, m.is_active, 
                s.current_quantity,
                sch.schedule_id, sch.time_to_take, sch.days_of_week, sch.dosage_amount,
                MAX(CASE WHEN ml.med_log_id IS NOT NULL THEN 1 ELSE 0 END) AS is_taken,
                MAX(ml.status) AS log_status
            FROM User_Medication m
            JOIN Stock s ON m.user_med_id = s.user_med_id
            LEFT JOIN Schedule sch ON m.user_med_id = sch.user_med_id
            LEFT JOIN Medication_Log ml ON sch.schedule_id = ml.schedule_id AND DATE(ml.taken_at) = CURDATE()
            WHERE m.user_id = ?
            AND (m.is_deleted = 0 OR m.is_deleted IS NULL)
        `;

        if (all !== 'true') {
            sql += ` AND (m.is_active = 1 OR m.is_active IS NULL)`;
        }

        sql += ` GROUP BY m.user_med_id, sch.schedule_id`;

        const [rows] = await db.query(sql, [userId]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching medications' });
    }
});

app.get('/api/disease-groups/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT DISTINCT disease_group 
            FROM User_Medication 
            WHERE user_id = ? AND disease_group IS NOT NULL AND disease_group != ''
        `, [userId]);
        const groups = rows.map(r => r.disease_group);
        res.json(groups);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching groups' });
    }
});

app.get('/api/master-medications', async (req, res) => {
    const { query } = req.query;
    try {
        let sql = 'SELECT * FROM Medication_Master';
        let params = [];

        if (query) {
            sql += ' WHERE generic_name LIKE ? OR trade_name LIKE ? OR description LIKE ?';
            params.push(`%${query}%`, `%${query}%`, `%${query}%`);
        }

        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching master medications' });
    }
});

// เพิ่มยาใหม่ ❇️ บันทึก trade_name และ mg
app.post('/api/medications', async (req, res) => {
    const {
        user_id, custom_name, trade_name, mg, instruction, dosage_unit, image_url,
        initial_quantity, notify_threshold, days_of_week, dosage_amount,
        intake_timing, start_date, end_date, times,
        disease_group, drug_type
    } = req.body;

    if (!user_id || !custom_name) {
        return res.status(400).json({ message: 'user_id และ custom_name จำเป็นต้องระบุ' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [medResult] = await connection.query(
            `INSERT INTO User_Medication 
            (user_id, custom_name, trade_name, mg, disease_group, drug_type, instruction, dosage_unit, dosage_amount, custom_image, intake_timing, start_date, end_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [user_id, custom_name, trade_name, mg, disease_group, drug_type, instruction, dosage_unit, dosage_amount, image_url, intake_timing, start_date, end_date]
        );
        const medId = medResult.insertId;

        await connection.query(
            `INSERT INTO Stock (user_med_id, current_quantity, notify_threshold) VALUES (?, ?, ?)`,
            [medId, initial_quantity, notify_threshold]
        );

        const scheduleIds = [];
        if (Array.isArray(times) && times.length > 0) {
            for (const timeStr of times) {
                const [schRes] = await connection.query(
                    `INSERT INTO Schedule (user_med_id, time_to_take, days_of_week, dosage_amount) VALUES (?, ?, ?, ?)`,
                    [medId, timeStr, days_of_week, dosage_amount]
                );
                scheduleIds.push(schRes.insertId);
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'เพิ่มยาเรียบร้อยแล้ว!', med_id: medId, schedule_ids: scheduleIds });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Error adding medication' });
    } finally {
        connection.release();
    }
});

// แก้ไขยา ❇️ บันทึก trade_name และ mg
app.put('/api/medications/:medId', async (req, res) => {
    const { medId } = req.params;
    const {
        custom_name, trade_name, mg, instruction, dosage_unit, image_url,
        initial_quantity, notify_threshold, intake_timing, start_date, end_date, times,
        disease_group, drug_type
    } = req.body;

    if (!custom_name) {
        return res.status(400).json({ message: 'custom_name จำเป็นต้องระบุ' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        let updateQuery = `
            UPDATE User_Medication 
            SET custom_name=?, trade_name=?, mg=?, disease_group=?, drug_type=?, instruction=?, dosage_unit=?, intake_timing=?, start_date=?, end_date=?
        `;
        const params = [custom_name, trade_name, mg, disease_group, drug_type, instruction, dosage_unit, intake_timing, start_date, end_date];

        if (image_url) {
            updateQuery += `, custom_image=?`;
            params.push(image_url);
        }
        updateQuery += ` WHERE user_med_id=?`;
        params.push(medId);

        await connection.query(updateQuery, params);

        await connection.query(
            `UPDATE Stock SET current_quantity=?, notify_threshold=? WHERE user_med_id=?`,
            [initial_quantity, notify_threshold, medId]
        );

        if (Array.isArray(times) && times.length > 0) {
            const [existingRows] = await connection.query(
                'SELECT time_to_take FROM Schedule WHERE user_med_id = ? ORDER BY time_to_take ASC',
                [medId]
            );

            const currentTimes = existingRows.map(r => r.time_to_take.substring(0, 5));
            const newTimes = times.map(t => t.substring(0, 5)).sort();
            const isTimeChanged = JSON.stringify(currentTimes) !== JSON.stringify(newTimes);

            if (isTimeChanged) {
                await connection.query(`
                    DELETE ml FROM Medication_Log ml
                    JOIN Schedule s ON ml.schedule_id = s.schedule_id
                    WHERE s.user_med_id = ?
                `, [medId]);

                await connection.query('DELETE FROM Schedule WHERE user_med_id = ?', [medId]);

                for (const timeStr of times) {
                    await connection.query(
                        `INSERT INTO Schedule (user_med_id, time_to_take, days_of_week, dosage_amount) VALUES (?, ?, ?, ?)`,
                        [medId, timeStr, 'Everyday', 1]
                    );
                }
            }
        }

        await connection.commit();
        res.json({ message: 'แก้ไขข้อมูลเรียบร้อย' });

    } catch (error) {
        await connection.rollback();
        console.error("Update Error:", error);
        res.status(500).json({ message: 'Error updating medication', error: error.message });
    } finally {
        connection.release();
    }
});

app.delete('/api/medications/:medId', async (req, res) => {
    const { medId } = req.params;
    try {
        await db.query(
            'UPDATE User_Medication SET is_deleted = 1 WHERE user_med_id = ?',
            [medId]
        );
        res.json({ message: 'ลบข้อมูลเรียบร้อย (เก็บประวัติไว้)' });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ message: 'Error deleting medication', error: error.message });
    }
});

// ==========================================
// 3. ส่วนการกินยา (Log Dose)
// ==========================================

// ❇️ ปรับปรุงให้ยิงแจ้งเตือนผู้ดูแลแทนการส่งกลับไปเครื่องผู้ป่วย
app.post('/api/log-dose', async (req, res) => {
    const { schedule_id, status } = req.body;
    console.log(`📥 [API /log-dose] ได้รับคำสั่งตัดสต็อก! schedule_id: ${schedule_id}, status: ${status}`);
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [existingLogs] = await connection.query(
            'SELECT * FROM Medication_Log WHERE schedule_id = ? AND DATE(taken_at) = CURDATE()',
            [schedule_id]
        );

        if (existingLogs.length > 0) {
            await connection.rollback();
            return res.status(200).json({ message: 'วันนี้คุณบันทึกยานี้ไปแล้ว' });
        }

        await connection.query(
            `INSERT INTO Medication_Log (schedule_id, status, taken_at) VALUES (?, ?, NOW())`,
            [schedule_id, status]
        );

        if (status === 'taken' || status === 'late') {
            const [scheduleRows] = await connection.query(
                `SELECT s.dosage_amount, s.user_med_id, um.user_id, um.custom_name 
                 FROM Schedule s 
                 JOIN User_Medication um ON s.user_med_id = um.user_med_id 
                 WHERE s.schedule_id = ?`,
                [schedule_id]
            );

            if (scheduleRows.length > 0) {
                const dosage = scheduleRows[0].dosage_amount;
                const medId = scheduleRows[0].user_med_id;
                const userId = scheduleRows[0].user_id;
                const medName = scheduleRows[0].custom_name;

                await connection.query(
                    'UPDATE Stock SET current_quantity = GREATEST(current_quantity - ?, 0) WHERE user_med_id = ?',
                    [dosage, medId]
                );

                const [stockRows] = await connection.query(
                    'SELECT current_quantity, notify_threshold FROM Stock WHERE user_med_id = ?',
                    [medId]
                );

                if (stockRows.length > 0) {
                    const { current_quantity, notify_threshold } = stockRows[0];
                    let alertMessage = null;

                    if (current_quantity <= notify_threshold && current_quantity > 0) {
                        alertMessage = `⚠️ ยา ${medName} ใกล้หมด! เหลือเพียง ${current_quantity} หน่วย`;
                    } else if (current_quantity === 0) {
                        alertMessage = `❌ ยา ${medName} หมดแล้ว! กรุณาเตรียมยาเพิ่มให้ผู้ป่วย`;
                    }

                    // ❇️ แทนที่จะส่ง alert กลับไปหา Frontend ของผู้ป่วย ให้ส่งหาผู้ดูแลแทน
                    if (alertMessage) {
                        await notifyCaregiver(userId, alertMessage);
                    }
                }

                await connection.commit();
                // ❇️ ตอบกลับผู้ป่วยโดยไม่มี alert 
                res.json({ message: 'บันทึกเรียบร้อย' });
                return;
            }
        } else if (status === 'missed') {
            await connection.commit();
            res.json({ message: 'บันทึกสถานะข้ามยาเรียบร้อย' });
            return;
        }

        await connection.commit();
        res.json({ message: 'บันทึกเรียบร้อย' });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Error logging dose' });
    } finally {
        connection.release();
    }
});

// ==========================================
// 4. ส่วนประวัติ & อาการ
// ==========================================

app.get('/api/history/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        await autoMarkMissedMedications(userId);
        const [rows] = await db.query(`
            SELECT 
                ml.med_log_id, ml.status, ml.taken_at,
                um.custom_name, s.dosage_amount, um.dosage_unit,
                s.time_to_take  
            FROM Medication_Log ml
            JOIN Schedule s ON ml.schedule_id = s.schedule_id
            JOIN User_Medication um ON s.user_med_id = um.user_med_id
            WHERE um.user_id = ?
            ORDER BY ml.taken_at DESC
        `, [userId]);
        res.json(rows);
    } catch (error) {
        console.error("Fetch History Error:", error);
        res.status(500).json({ message: 'Error fetching history' });
    }
});

app.post('/api/symptoms', async (req, res) => {
    const { user_id, symptom_name, description, severity } = req.body;
    try {
        await db.query(
            `INSERT INTO Symptom_Log (user_id, symptom_name, description, severity, log_timestamp) 
             VALUES (?, ?, ?, ?, NOW())`,
            [user_id, symptom_name, description, severity]
        );
        res.status(201).json({ message: 'บันทึกอาการเรียบร้อย' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error saving symptom' });
    }
});

app.get('/api/symptoms/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await db.query(
            `SELECT * FROM Symptom_Log WHERE user_id = ? ORDER BY log_timestamp DESC`,
            [userId]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching symptoms' });
    }
});

// ==========================================
// 5. ส่วนผู้ดูแล (Caregiver)
// ==========================================
app.post('/api/caregiver/register', async (req, res) => {
    const { email, password, firstname, lastname } = req.body;

    if (!email || !password || !firstname || !lastname) {
        return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    try {
        const [existingCaregiver] = await db.query('SELECT * FROM Caregiver WHERE email = ?', [email]);
        if (existingCaregiver.length > 0) {
            return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้วในระบบผู้ดูแล' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await db.query(
            'INSERT INTO Caregiver (email, password, firstname, lastname) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, firstname, lastname]
        );
        res.status(201).json({ message: 'สมัครสมาชิกผู้ดูแลเรียบร้อยแล้ว' });
    } catch (error) {
        console.error("Caregiver Register Error:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสมัครสมาชิกผู้ดูแล' });
    }
});

app.post('/api/caregiver/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM Caregiver WHERE email = ?', [email]);
        if (rows.length === 0) return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });

        const caregiver = rows[0];
        const isMatch = await bcrypt.compare(password, caregiver.password);
        if (!isMatch) return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });

        res.json(caregiver);
    } catch (error) {
        console.error("Caregiver Login Error:", error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

app.get('/api/caregivers/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT c.caring_id, c.granted_date, cg.firstname, cg.lastname, cg.email
            FROM Caring c
            JOIN Caregiver cg ON c.caregiver_id = cg.caregiver_id
            WHERE c.user_id = ?
        `, [userId]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching caregivers' });
    }
});

app.post('/api/caregivers/invite', async (req, res) => {
    const { user_id, email } = req.body;
    try {
        const [caregivers] = await db.query('SELECT caregiver_id FROM Caregiver WHERE email = ?', [email]);

        if (caregivers.length === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ดูแลที่มีอีเมลนี้ในระบบ' });
        }

        const caregiverId = caregivers[0].caregiver_id;
        const [existing] = await db.query(
            'SELECT * FROM Caring WHERE user_id = ? AND caregiver_id = ?',
            [user_id, caregiverId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'คุณได้เพิ่มผู้ดูแลคนนี้ไปแล้ว' });
        }

        await db.query(
            'INSERT INTO Caring (user_id, caregiver_id, status, granted_date) VALUES (?, ?, ?, NOW())',
            [user_id, caregiverId, 'active']
        );

        res.status(201).json({ message: 'เพิ่มผู้ดูแลเรียบร้อยแล้ว' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error inviting caregiver' });
    }
});

app.delete('/api/caregivers/:caringId', async (req, res) => {
    const { caringId } = req.params;
    try {
        await db.query('DELETE FROM Caring WHERE caring_id = ?', [caringId]);
        res.json({ message: 'ลบผู้ดูแลเรียบร้อย' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error removing caregiver' });
    }
});

app.put('/api/caregivers/:id', async (req, res) => {
    const { id } = req.params;
    const { firstname, lastname, password, profile_image } = req.body;

    try {
        let query = 'UPDATE Caregiver SET firstname = ?, lastname = ?';
        let params = [firstname, lastname];

        if (profile_image) {
            query += ', profile_image = ?';
            params.push(profile_image);
        }

        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            query += ', password = ?';
            params.push(hashedPassword);
        }

        query += ' WHERE caregiver_id = ?';
        params.push(id);

        await db.query(query, params);

        const [updated] = await db.query('SELECT * FROM Caregiver WHERE caregiver_id = ?', [id]);
        res.json(updated[0]);

    } catch (error) {
        console.error("Update Caregiver Error:", error);
        res.status(500).json({ message: 'Error updating caregiver profile' });
    }
});

app.get('/api/caregiver/patients/:caregiverId', async (req, res) => {
    const { caregiverId } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT u.user_id AS id, u.firstname, u.lastname, u.email, u.profile_image
            FROM Caring c
            JOIN user u ON c.user_id = u.user_id
            WHERE c.caregiver_id = ? AND c.status = 'active'
        `, [caregiverId]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching patients' });
    }
});

app.get('/api/caregiver/patient/:userId/dashboard', async (req, res) => {
    const { userId } = req.params;
    try {
        const [logs] = await db.query(`
            SELECT ml.status, ml.taken_at, um.custom_name, s.time_to_take
            FROM Medication_Log ml
            JOIN Schedule s ON ml.schedule_id = s.schedule_id
            JOIN User_Medication um ON s.user_med_id = um.user_med_id
            WHERE um.user_id = ? AND DATE(ml.taken_at) = CURDATE()
            ORDER BY ml.taken_at DESC
        `, [userId]);

        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) as taken
            FROM Medication_Log ml
            JOIN Schedule s ON ml.schedule_id = s.schedule_id
            JOIN User_Medication um ON s.user_med_id = um.user_med_id
            WHERE um.user_id = ? AND MONTH(ml.taken_at) = MONTH(CURDATE())
        `, [userId]);

        const total = stats[0].total || 1;
        const taken = stats[0].taken || 0;
        const percentage = Math.round((taken / total) * 100);

        res.json({ logs: logs, percentage: percentage });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching dashboard' });
    }
});

app.post('/api/caregivers/link-qr', async (req, res) => {
    const { caregiver_id, invite_code } = req.body;
    try {
        const [users] = await db.query('SELECT user_id FROM user WHERE invite_code = ?', [invite_code]);

        if (users.length === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน (QR Code ไม่ถูกต้อง)' });
        }

        const targetUserId = users[0].user_id;

        const [existing] = await db.query(
            'SELECT * FROM Caring WHERE user_id = ? AND caregiver_id = ?',
            [targetUserId, caregiver_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'คุณดูแลผู้ป่วยคนนี้อยู่แล้ว' });
        }

        await db.query(
            'INSERT INTO Caring (user_id, caregiver_id, status, granted_date) VALUES (?, ?, ?, NOW())',
            [targetUserId, caregiver_id, 'active']
        );

        res.status(201).json({ message: 'เพิ่มผู้ป่วยเรียบร้อยแล้ว' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error linking caregiver' });
    }
});
app.put('/api/caregiver/:id/token', async (req, res) => {
    const { id } = req.params;
    const { token } = req.body;
    try {
        await db.query('UPDATE Caregiver SET device_token = ? WHERE caregiver_id = ?', [token, id]);
        res.json({ message: 'อัปเดต Token เรียบร้อย' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึก Token' });
    }
});

// ==========================================
// 6. ส่วน Admin (ฉบับสมบูรณ์)
// ==========================================

app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM Admin WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ message: 'Username ไม่ถูกต้อง' });

        const admin = rows[0];
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });

        res.json(admin);
    } catch (error) {
        res.status(500).json({ message: 'Error logging in' });
    }
});

app.get('/api/admin/users', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT user_id AS id, firstname, lastname, email FROM user');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
});

app.put('/api/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    const { firstname, lastname, email, profile_image } = req.body;
    try {
        await db.query(
            "UPDATE user SET firstname = ?, lastname = ?, email = ?, profile_image = ? WHERE user_id = ?",
            [firstname, lastname, email, profile_image, id]
        );
        res.json({ message: "อัปเดตข้อมูลผู้ใช้และรูปภาพเรียบร้อยแล้ว" });
    } catch (error) {
        res.status(500).json({ message: "ไม่สามารถแก้ไขข้อมูลได้" });
    }
});

app.delete('/api/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM Caring WHERE user_id = ? OR caregiver_id = ?', [id, id]);
        await db.query('DELETE FROM Symptom_Log WHERE user_id = ?', [id]);
        await db.query(`
            DELETE FROM Medication_Log 
            WHERE schedule_id IN (
                SELECT schedule_id FROM Schedule 
                WHERE user_med_id IN (
                    SELECT user_med_id FROM User_Medication WHERE user_id = ?
                )
            )`, [id]);
        await db.query(`
            DELETE FROM Schedule 
            WHERE user_med_id IN (
                SELECT user_med_id FROM User_Medication WHERE user_id = ?
            )`, [id]);
        await db.query(`
            DELETE FROM Stock 
            WHERE user_med_id IN (
                SELECT user_med_id FROM User_Medication WHERE user_id = ?
            )`, [id]);
        await db.query('DELETE FROM User_Medication WHERE user_id = ?', [id]);
        await db.query('DELETE FROM user WHERE user_id = ?', [id]);

        res.json({ message: 'ลบผู้ใช้งานและข้อมูลที่เกี่ยวข้องทั้งหมดเรียบร้อยแล้ว' });
    } catch (error) {
        console.error("Delete User Error:", error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการลบผู้ใช้',
            error: error.message
        });
    }
});

app.get('/api/admin/medications', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Medication_Master');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching master medications' });
    }
});

// ❇️ เพิ่มการรับค่า trade_name, mg 
app.post('/api/admin/medications', async (req, res) => {
    const { generic_name, trade_name, mg, description, dosage_unit, image_url, drug_type, default_disease_group } = req.body;
    try {
        await db.query(
            'INSERT INTO Medication_Master (generic_name, trade_name, mg, description, dosage_unit, image_url, drug_type, default_disease_group) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [generic_name, trade_name, mg, description, dosage_unit, image_url, drug_type, default_disease_group]
        );
        res.status(201).json({ message: 'เพิ่มยาเข้าคลังหลักเรียบร้อย' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding medication' });
    }
});

// ❇️ เพิ่มการรับค่า trade_name, mg
app.put('/api/admin/master-medications/:id', async (req, res) => {
    const { id } = req.params;
    const { generic_name, trade_name, mg, description, dosage_unit, image_url, drug_type, default_disease_group } = req.body;
    try {
        await db.query(
            "UPDATE Medication_Master SET generic_name = ?, trade_name = ?, mg = ?, description = ?, dosage_unit = ?, image_url = ?, drug_type = ?, default_disease_group = ? WHERE med_id = ?",
            [generic_name, trade_name, mg, description, dosage_unit, image_url, drug_type, default_disease_group, id]
        );
        res.json({ message: "อัปเดตข้อมูลยาหลักเรียบร้อยแล้ว" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "ไม่สามารถแก้ไขข้อมูลได้" });
    }
});

app.delete('/api/admin/master-medications/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM Medication_Master WHERE med_id = ?", [id]);
        res.json({ message: "ลบยาออกจากคลังหลักเรียบร้อย" });
    } catch (err) {
        res.status(500).json({ message: "ลบไม่ได้" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});