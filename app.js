// 1. ตั้งค่าและเชื่อมต่อ Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDY-LYy_ci9Jz5Wre4zDRCr8TP-58ng-bo",
    authDomain: "my-office-quiz.firebaseapp.com",
    projectId: "my-office-quiz",
    storageBucket: "my-office-quiz.firebasestorage.app",
    messagingSenderId: "1075817017274",
    appId: "1:1075817017274:web:ac54fd1f8a9a0e3d06f783",
    measurementId: "G-ZDXMQC8QB9"
};

// เริ่มต้นใช้งาน Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ตัวแปรส่วนกลางสำหรับระบบข้อสอบ
let currentUser = {};
let quizQuestions = [];      // เก็บข้อสอบ 20 ข้อที่สุ่มมาได้
let currentQuestionIndex = 0; // บอกว่าตอนนี้ทำอยู่ข้อที่เท่าไหร่
let score = 0;               // คะแนนสะสม

// 2. ฟังก์ชันตรวจสอบการเข้าสู่ระบบและรหัส PIN
async function checkLogin() {
    const id = document.getElementById('emp-id').value.trim();
    const name = document.getElementById('emp-name').value.trim();
    const pin = document.getElementById('emp-pin').value.trim();
    const loginBtn = document.getElementById('login-btn');

    if (!id || !pin) {
        alert('กรุณากรอกรหัสพนักงานและรหัส PIN ด้วยครับ');
        return;
    }
    if (pin.length !== 4 || isNaN(pin)) {
        alert('รหัส PIN ต้องเป็นตัวเลข 4 หลักเท่านั้นครับ');
        return;
    }

    loginBtn.innerText = "กำลังตรวจสอบ...";
    loginBtn.disabled = true;

    try {
        const docRef = db.collection('employees').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            alert('❌ ไม่พบรหัสพนักงานนี้ในระบบ กรุณาตรวจสอบอีกครั้ง');
            resetLoginButton();
            return;
        }

        const empData = docSnap.data();

        if (empData.pin_code === "") {
            if (!name) {
                alert('💡 เนื่องจากการเข้าใช้งานครั้งแรก กรุณากรอก "ชื่อ-นามสกุล" เพื่อยืนยันตัวตนในการตั้งรหัส PIN ด้วยครับ');
                resetLoginButton();
                return;
            }
            if (name !== empData.employee_name) {
                alert('❌ ชื่อ-นามสกุลไม่ตรงกับรหัสพนักงานนี้ในฐานข้อมูล');
                resetLoginButton();
                return;
            }

            await docRef.update({ pin_code: pin });
            alert('🎉 ตั้งรหัส PIN สำเร็จ! รหัสนี้จะใช้สำหรับเข้าสอบในครั้งต่อไป');
            currentUser = { empId: id, empName: empData.employee_name, empDept: empData.department };

        } else {
            if (pin !== empData.pin_code) {
                alert('❌ รหัส PIN ไม่ถูกต้อง กรุณากรอกรหัสที่คุณเคยตั้งไว้');
                resetLoginButton();
                return;
            }
            currentUser = { empId: id, empName: empData.employee_name, empDept: empData.department };
        }

        document.getElementById('user-display').innerText = 
            `ผู้สอบ: ${currentUser.empName} (${currentUser.empId}) | แผนก: ${currentUser.empDept}`;

        // สลับหน้าจอไปหน้าทำข้อสอบ
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('quiz-screen').classList.add('active');

        // เริ่มต้นโหลดข้อสอบจาก Firebase
        loadQuestions();

    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการล็อกอิน:", error);
        alert("เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง");
        resetLoginButton();
    }
}

function resetLoginButton() {
    const loginBtn = document.getElementById('login-btn');
    loginBtn.innerText = "ตรวจสอบข้อมูลและเข้าสอบ";
    loginBtn.disabled = false;
}

// 3. ฟังก์ชันดึงข้อสอบ สุ่มข้อ และคัดมา 20 ข้อ
async function loadQuestions() {
    try {
        const querySnapshot = await db.collection('questions').get();
        let allQuestions = [];
        
        querySnapshot.forEach((doc) => {
            allQuestions.push(doc.data());
        });

        if (allQuestions.length < 20) {
            alert(`⚠️ ข้อสอบในระบบมีทั้งหมด ${allQuestions.length} ข้อ ซึ่งน้อยกว่า 20 ข้อ กรุณาเพิ่มข้อสอบก่อนครับ`);
            return;
        }

        // อัลกอริทึม Fisher-Yates สลับตำแหน่งข้อสอบใน Array แบบสุ่มจริง
        for (let i = allQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
        }

        // ตัดเอามาแค่ 20 ข้อแรกหลังจากสลับแล้ว
        quizQuestions = allQuestions.slice(0, 20);
        currentQuestionIndex = 0;
        score = 0;

        // เรียกฟังก์ชันแสดงข้อสอบข้อแรก
        displayQuestion();

    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการโหลดข้อสอบ:", error);
        document.getElementById('quiz-area').innerHTML = "<p style='color:red;'>ไม่สามารถดึงข้อสอบได้ กรุณาติดต่อผู้ดูแลระบบ</p>";
    }
}

// 4. ฟังก์ชันแสดงข้อสอบทีละข้อ
function displayQuestion() {
    const quizArea = document.getElementById('quiz-area');
    const currentQuiz = quizQuestions[currentQuestionIndex];

    // สร้างโครงสร้างหน้าจอแสดงโจทย์และตัวเลือก 4 ปุ่ม
    let html = `
        <div style="margin-bottom: 15px; font-weight: bold; font-size: 18px;">
            ข้อที่ ${currentQuestionIndex + 1}/20: ${currentQuiz.question}
        </div>
        <div id="options-container">
    `;

    // วนลูปสร้างปุ่มตัวเลือก 4 ข้อ
    currentQuiz.options.forEach((option, index) => {
        const optionNum = index + 1; // 1, 2, 3, 4
        html += `
            <button class="option-btn" id="opt-${optionNum}" onclick="checkAnswer(${optionNum})" 
                    style="background-color: white; color: #333; border: 1px solid #ccc; margin-bottom: 10px; text-align: left; font-weight: normal;">
                ${optionNum}. ${option}
            </button>
        `;
    });

    html += `
        </div>
        <div id="explanation-box" style="display: none; padding: 15px; border-radius: 6px; margin: 15px 0; font-size: 15px; line-height: 1.5;"></div>
        
        <button id="next-btn" onclick="nextQuestion()" style="display: none; background-color: #f1f3f4; color: #333; border: 1px solid #dadce0; margin-top: 10px;">
            ${currentQuestionIndex === 19 ? 'ส่งแบบทดสอบ' : 'ข้อถัดไป ➡️'}
        </button>
    `;

    quizArea.innerHTML = html;
}

// 5. ฟังก์ชันตรวจคำตอบทันทีเมื่อกดเลือกข้อ
function checkAnswer(selectedNum) {
    const currentQuiz = quizQuestions[currentQuestionIndex];
    const correctNum = currentQuiz.answer;
    
    // ล็อกปุ่มตัวเลือกทั้งหมดไม่ให้กดซ้ำได้อีก
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(btn => btn.disabled = true);

    const selectedBtn = document.getElementById(`opt-${selectedNum}`);
    const correctBtn = document.getElementById(`opt-${correctNum}`);

    // ไฮไลท์สีตามคำตอบ
    if (selectedNum === correctNum) {
        // ตอบถูก -> เปลี่ยนเป็นสีเขียว
        selectedBtn.style.backgroundColor = '#e6f4ea';
        selectedBtn.style.borderColor = '#137333';
        selectedBtn.style.color = '#137333';
        selectedBtn.style.fontWeight = 'bold';
        score++;
    } else {
        // ตอบผิด -> ข้อที่เลือกเป็นสีแดง ข้อที่ถูกเฉลยเป็นสีเขียว
        selectedBtn.style.backgroundColor = '#fce8e6';
        selectedBtn.style.borderColor = '#c5221f';
        selectedBtn.style.color = '#c5221f';
        
        correctBtn.style.backgroundColor = '#e6f4ea';
        correctBtn.style.borderColor = '#137333';
        correctBtn.style.color = '#137333';
        correctBtn.style.fontWeight = 'bold';
    }

    // แสดงคำอธิบายอ้างอิงจากคอลัมน์อธิบายใน Excel
    const expBox = document.getElementById('explanation-box');
    expBox.style.display = 'block';
    if (selectedNum === correctNum) {
        expBox.style.backgroundColor = '#e8f0fe';
        expBox.style.color = '#1a73e8';
        expBox.innerHTML = `<b>ถูกต้อง!</b> ✨ <br>${currentQuiz.explanation || 'ไม่มีคำอธิบายเพิ่มเติม'}`;
    } else {
        expBox.style.backgroundColor = '#fef7e0';
        expBox.style.color = '#b06000';
        expBox.innerHTML = `<b>ยังไม่ถูกนะ.. เฉลยคือข้อ ${correctNum}</b> 💡 <br>${currentQuiz.explanation || 'ไม่มีคำอธิบายเพิ่มเติม'}`;
    }

    // แสดงปุ่มเพื่อไปข้อต่อไป
    document.getElementById('next-btn').style.display = 'block';
}

// 6. ฟังก์ชันเปลี่ยนข้อสอบ
function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < 20) {
        displayQuestion();
    } else {
        showResult();
    }
}

// 7. ฟังก์ชันประมวลผลสรุปคะแนนตอนจบ (เกณฑ์ผ่าน 80%)
async function showResult() {
    // สลับหน้าจอไปหน้าผลลัพธ์
    document.getElementById('quiz-screen').classList.remove('active');
    document.getElementById('result-screen').classList.add('active');

    const resultArea = document.getElementById('result-area');
    
    // คำนวณเปอร์เซ็นต์ (ผ่าน 80% คือต้องได้ 16 ข้อขึ้นไป)
    const passed = score >= 16;
    const statusText = passed ? "🎉 ผ่านเกณฑ์การประเมิน" : "❌ ไม่ผ่านเกณฑ์การประเมิน";
    const statusColor = passed ? "#137333" : "#c5221f";
    const statusBg = passed ? "#e6f4ea" : "#fce8e6";

    resultArea.innerHTML = `
        <div style="text-align: center; padding: 20px; border-radius: 8px; background-color: ${statusBg}; color: ${statusColor}; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; font-size: 22px;">${statusText}</h3>
            <p style="font-size: 32px; font-weight: bold; margin: 0;">${score} / 20 คะแนน</p>
            <p style="margin: 5px 0 0 0;">(คิดเป็น ${(score/20*100)}% | เกณฑ์ผ่านคือ 80%)</p>
        </div>
        <button onclick="location.reload()" style="background-color: #1a73e8; color: white;">กลับสู่หน้าแรก</button>
    `;

    // บันทึกผลคะแนนสอบลง Firebase อัตโนมัติใน Collection ชื่อ 'quiz_results'
    try {
        await db.collection('quiz_results').add({
            employee_id: currentUser.empId,
            employee_name: currentUser.empName,
            department: currentUser.empDept,
            score: score,
            total_questions: 20,
            percentage: (score / 20 * 100),
            status: passed ? "ผ่าน" : "ไม่ผ่าน",
            timestamp: firebase.firestore.FieldValue.serverTimestamp() // เวลาเซิร์ฟเวอร์
        });
        console.log("บันทึกผลคะแนนเรียบร้อยแล้ว");
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการบันทึกคะแนน:", error);
    }
}
