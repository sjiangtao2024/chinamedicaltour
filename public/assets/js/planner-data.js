// Text constants
const plannerText = {
    planningTitle: "Planning Summary: No items selected",
    estimateTime: "Estimate Time:",
    estimateCost: "Estimate cost:",
    generateItinerary: "Generate Detailed Itinerary",
    selectedAttractions: "Selected Attractions",
    hours: "Hours",
    days: "Days",
    day: "day",
    rmb: "RMB",
    selectAttraction: "Click to select/deselect",
    duration: "Duration",
    price: "Price",
    timeNote: "* Time estimates include meals and transportation. Actual time may vary.",
    medicalPackageTitle: "Medical Package Selection",
    basicPackageTitle: "Basic Package",
    basicPackageDesc: "Routine health check-up, suitable for annual screening",
    elitePackageTitle: "Elite Package",
    elitePackageDesc: "Enhanced screening with organ and cancer detection",
    premiumPackageTitle: "Premium Package",
    premiumPackageDesc: "Comprehensive health assessment with cardiovascular and genetic testing",
    selectPackage: "Select Package",
    mostPopular: "Most Popular",
    medicalPackageSelected: "Medical Package Selected",
    reportWaitTime: "Report wait time: 7 days (travel activities can be done during this period)",
    totalMedicalTourismCost: "Total Medical Tourism Cost",
    totalMedicalTourismTime: "Total Medical Tourism Time",
    transportationIncluded: "Hotel-hospital round-trip transportation included",
    priceDisclaimer: "This tool provides suggestions based on existing data. Actual time and costs may vary due to seasons, transportation, regulations, and other uncontrollable and human factors. Please refer to the actual situation on the day! We do not assume any consequences arising from the time and costs suggested by this tool."
};

// Medical package data
const medicalPackagesData = {
    basic: {
        id: 'basic',
        name: 'Basic Package',
        description: 'Routine health check-up, suitable for annual screening',
        duration: 1, // days
        price: { usd: 299 },
        reportWaitDays: 7
    },
    elite: {
        id: 'elite',
        name: 'Elite Package',
        description: 'Enhanced screening with organ and cancer detection',
        duration: 1, // days
        price: { usd: 599 },
        reportWaitDays: 7
    },
    premium: {
        id: 'premium',
        name: 'Premium Package',
        description: 'Comprehensive health assessment with cardiovascular and genetic testing',
        duration: 1, // days
        price: { usd: 1399 },
        reportWaitDays: 7
    }
};

// Attraction data
const attractionsData = {
    beijing: [
        {
            id: 'forbidden-city',
            name: 'Forbidden City',
            description: 'Built 1406-1420, home to 24 emperors for nearly 500 years. World\'s largest ancient palace complex with 9999.5 rooms.',
            duration: 4,
            priceUSD: 8,
            image: 'https://images.unsplash.com/photo-1603120527222-33f28c2ce89e?q=80&w=1354&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
        },
        {
            id: 'summer-palace',
            name: 'Summer Palace',
            description: 'UNESCO World Heritage site with royal gardens, Kunming Lake and famous marble boat. Masterpiece of Chinese garden art.',
            duration: 3,
            priceUSD: 7,
            image: 'https://images.unsplash.com/photo-1619825479213-62e158b5a79d?w=700&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fHN1bW1lciUyMHBhbGFjZXxlbnwwfHwwfHx8MA%3D%3D'
        },
        {
            id: 'temple-of-heaven',
            name: 'Temple of Heaven',
            description: 'Imperial complex where emperors prayed for good harvests. Famous for its circular Hall of Prayer and Echo Wall.',
            duration: 2,
            priceUSD: 5,
            image: 'assets/images/temple_of_heaven.png'
        },
        {
            id: 'great-wall',
            name: 'Great Wall (Mutianyu)',
            description: 'Less crowded section of the Great Wall with cable car access. Stunning mountain views and well-preserved watchtowers.',
            duration: 6,
            priceUSD: 6,
            image: 'https://plus.unsplash.com/premium_photo-1664304492320-8359efcaad38?q=80&w=2233&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
        },
        {
            id: 'hutong-tour',
            name: 'Hutong Cultural Tour',
            description: 'Explore traditional Beijing alleys by rickshaw, visit local family homes, and experience authentic Beijing culture.',
            duration: 3,
            priceUSD: 17,
            image: 'https://images.unsplash.com/photo-1721888664258-54f00f52b147?q=80&w=1335&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
        },
        {
            id: 'beijing-opera',
            name: 'Beijing Opera Show',
            description: 'Traditional Chinese opera performance with elaborate costumes, makeup, and classical music.',
            duration: 2,
            priceUSD: 25,
            image: 'https://images.unsplash.com/photo-1743074921223-704aafe873f5?q=80&w=1860&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
        },
        {
            id: 'beijing-palace-banquet',
            name: 'Beijing Imperial Palace Banquet',
            description: 'Experience a royal feast in an authentic imperial setting with traditional performances, court cuisine, and period costumes. Immerse yourself in 600 years of palace culture.',
            duration: 2.5,
            priceUSD: 77,
            image: 'https://qcloud.dpfile.com/pc/GU81KhgNvsoBo5ri_1T0CzYn_py7LI7ZJXwLp6jcAP-RQmKmKLPEc8Za2iPl8X6FAsjew4BovU6axjPJM2w4nrGzA5roSQdOIZBdpbY56uQFaWqA0j7ta3_A22czT6CvR2wBLHpNWleM8u_F-3h0csaq1-bq6jn4ci07g10pOcR8r-pAC7Z8Me1lmvv-C1rCtuD2Ttc33o2oiy9iGY5KAqS8eU1WRISyVZ5oaCuzdo9GQLj2BUn2Fvl5kTJ57OrBF71mYN0a8QgyjWdwktTu-fYgOcgUCm09oTOzMP3hqp-x0TbmP-QDAyHpIftm1Qa3HFwW-4E8RJFWU33naJoEDq_K_3fzUb4xkJuOOV-RZSUc45Y89_Wwp4ZxBY1BekyTNsZ94K-9pTz-ND1BwuvAA9mpEXrSC_vq7SXOLbSh0F7r_WluI6ZAAXEAIVPzr7aFuae7lo1XId4RfYZA2E9MRlDoqPENHlo17Cy93rHQuC0OboEbo4q9vi3Z3llldIEGOx9i7iIcpl6C2Rcl5UCTNuTgLJj3Tyj37h7BwX8mDNDTtMzAm9Ao1OzMu6UzwwhDcnevFMP8gjC5vn_-sW8cW1E6ydPph68pn_IBwOnU5FwwXQKcVMr19MQGdAcvTpBH.jpg'
        }
    ],
    chengdu: [
        {
            id: 'panda-interaction',
            name: 'Giant Panda Interaction',
            description: 'Unique opportunity to interact with 1-year-old panda cubs. Professional handlers guide you through a 2-minute interaction and photo session.',
            duration: 2,
            priceUSD: 1000,
            image: 'https://img20.360buyimg.com/openfeedback/jfs/t1/293098/18/13293/371821/6858c2fdFd18bfc3c/81cfff05979e1541.jpg'
        },
        {
            id: 'panda-volunteer',
            name: 'Panda Volunteer Experience',
            description: 'Full-day volunteer program including enclosure cleaning, bamboo preparation, and educational activities. Receive official volunteer certificate.',
            duration: 8.5,
            priceUSD: 500,
            image: 'https://q6.itc.cn/q_70/images03/20250622/305e846be6994a1383ff0a728788efaa.jpeg'
        },
        {
            id: 'panda-base',
            name: 'Giant Panda Research Base',
            description: 'World-famous panda conservation center where you can observe giant pandas in their natural habitat.',
            duration: 3,
            priceUSD: 8,
            image: 'assets/images/panda_base.png'
        },
        {
            id: 'qingcheng-mountain',
            name: 'Qingcheng Mountain',
            description: 'Birthplace of Taoism, known as the "Fifth Grotto-heaven". Founded by Zhang Daoling in Eastern Han Dynasty. Stay overnight at Yuanming Palace for deep cultural immersion.',
            duration: 6,
            priceUSD: 13,
            image: 'https://miaobi-lite.bj.bcebos.com/miaobi/5mao/b%276Z2S5Z%2BO5bGx6KW/5ri46K6w5Y%2BW5pmv5ZywXzE3MjkzODE1NjQuNzY1MzUxNQ%3D%3D%27/0.png'
        },
        {
            id: 'dujiangyan',
            name: 'Dujiangyan Irrigation System',
            description: 'Ancient irrigation system built in 256 BC, creating the "Land of Abundance". Marvel at the ingenious "Fish Mouth", "Flying Sand Weir", and "Bottle Neck" design.',
            duration: 4,
            priceUSD: 11,
            image: 'https://q8.itc.cn/images01/20250310/c3393ad7d3734ee6971bb477f37cc711.jpeg'
        },
        {
            id: 'wuhou-shrine',
            name: 'Wuhou Shrine',
            description: 'China\'s only temple dedicated to both emperor and minister, commemorating Liu Bei and Zhuge Liang. Famous for "Red Walls and Bamboo Shadows", adjacent to Jinli Ancient Street.',
            duration: 2,
            priceUSD: 7,
            image: 'https://www.wuhouci.net.cn/resources/assets/images/whc2021.jpg'
        },
        {
            id: 'kuanzhai-alley',
            name: 'Kuanzhai Alley',
            description: 'Qing Dynasty hutong heritage consisting of Wide, Narrow, and Well alleys. Blend of Sichuan folk architecture and Western elements, perfect for experiencing Chengdu\'s slow life.',
            duration: 2,
            priceUSD: 0,
            image: 'assets/images/kuanzhai_alley.png'
        },
        {
            id: 'mahjong-culture',
            name: 'Mahjong Culture Experience',
            description: 'Experience unique "stream mahjong" in Huanglongxi or Dujiangyan Hongkou. Playing mahjong in cool stream water is a distinctive Chengdu summer tradition.',
            duration: 3,
            priceUSD: 21,
            image: 'https://q9.itc.cn/q_70/images03/20240105/03969234cf0f4f20b7d486a790a35dbe.jpeg'
        },
        {
            id: 'palace-banquet',
            name: 'Shu Kingdom Palace Banquet',
            description: 'Immersive Han-Tang court dining experience with traditional music, bamboo crafts, lacquerware, and live performances. Interactive NPCs and dynamic ancient paintings.',
            duration: 2.5,
            priceUSD: 90,
            image: 'https://qcloud.dpfile.com/pc/7vji8Tzrwzf323uT2eVPg81B46zNgPq3DJgtoMu1SISS_XU_ddTspnpsmq2FYaDx.jpg'
        },
        {
            id: 'jinli-street',
            name: 'Jinli Ancient Street',
            description: 'Historic street with traditional architecture, local snacks, handicrafts, and Sichuan opera performances.',
            duration: 2,
            priceUSD: 0,
            image: 'https://gips1.baidu.com/it/u=2265047180,47231142&fm=3074&app=3074&f=JPEG'
        },
        {
            id: 'sichuan-cuisine',
            name: 'Sichuan Cuisine Experience',
            description: 'Hands-on cooking class learning to make authentic Sichuan dishes like mapo tofu and kung pao chicken.',
            duration: 4,
            priceUSD: 39,
            image: 'https://miaobi-lite.bj.bcebos.com/miaobi/5mao/b%276K%2BE5YiG6auY55qE5bed6I%2Bc6aSQ5Y6FXzE3MzQ1Mzk2ODAuMjE4ODk%3D%27/0.png'
        },
        {
            id: 'tea-house',
            name: 'Traditional Tea House',
            description: 'Experience Chengdu\'s tea culture with traditional tea ceremony and local snacks in historic tea house.',
            duration: 2,
            priceUSD: 11,
            image: 'assets/images/tea_house.png'
        },
        {
            id: 'face-changing',
            name: 'Sichuan Opera Face Changing',
            description: 'Watch the mysterious art of face-changing in traditional Sichuan opera performance.',
            duration: 1.5,
            priceUSD: 17,
            image: 'https://qcloud.dpfile.com/pc/_9JFTErgcYwS8UKMf-39hDuvUXA5VgGRg8U9tGLRLkYaYY0PfhlEQ1WPqzILoArg.jpg'
        }
    ]
};
