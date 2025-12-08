// Language data
const plannerTranslations = {
    en: {
        beijing: "Beijing",
        chengdu: "Chengdu",
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
    },
    zh: {
        beijing: "北京",
        chengdu: "成都",
        planningTitle: "规划摘要：未选择项目",
        estimateTime: "预计时间：",
        estimateCost: "预计费用：",
        generateItinerary: "生成详细行程",
        selectedAttractions: "已选景点",
        hours: "小时",
        days: "天",
        day: "天",
        rmb: "人民币",
        selectAttraction: "点击选择/取消选择",
        duration: "游玩时间",
        price: "门票价格",
        timeNote: "* 预计时间已包含用餐和交通时间，实际时间可能有偏差",
        medicalPackageTitle: "体检套餐选择",
        basicPackageTitle: "基础套餐",
        basicPackageDesc: "常规健康检查，适合年度体检",
        elitePackageTitle: "精英套餐",
        elitePackageDesc: "在基础套餐之上，增加重要脏器和癌症筛查",
        premiumPackageTitle: "尊享套餐",
        premiumPackageDesc: "全面深入的健康评估，心脑血管及基因检测",
        selectPackage: "选择套餐",
        mostPopular: "最受欢迎",
        medicalPackageSelected: "已选择体检套餐",
        reportWaitTime: "报告等待时间：7天（等待期间可进行旅游活动）",
        totalMedicalTourismCost: "医疗旅游总费用",
        totalMedicalTourismTime: "医疗旅游总时间",
        transportationIncluded: "包含宾馆到医院往返车费",
        priceDisclaimer: "本工具只是根据现有的数据提供建议，实际的时间和费用可能会因为季节，交通，管制以及其他一切不可控和人为因素造成变化。请以当天的实际情况为准！我们并不承担以此工具所建议的时间和费用所带来的一切后果。"
    }
};

// Medical package data
const medicalPackagesData = {
    basic: {
        id: 'basic',
        name: { en: 'Basic Package', zh: '基础套餐' },
        description: {
            en: 'Routine health check-up, suitable for annual screening',
            zh: '常规健康检查，适合年度体检'
        },
        duration: 1, // days
        price: { usd: 299, rmb: 2105 }, // Updated price: 299 USD / 2105 RMB
        reportWaitDays: 7
    },
    elite: {
        id: 'elite',
        name: { en: 'Elite Package', zh: '精英套餐' },
        description: {
            en: 'Enhanced screening with organ and cancer detection',
            zh: '在基础套餐之上，增加重要脏器和癌症筛查'
        },
        duration: 1, // days
        price: { usd: 599, rmb: 4220 }, // 599 USD / 4220 RMB
        reportWaitDays: 7
    },
    premium: {
        id: 'premium',
        name: { en: 'Premium Package', zh: '尊享套餐' },
        description: {
            en: 'Comprehensive health assessment with cardiovascular and genetic testing',
            zh: '全面深入的健康评估，心脑血管及基因检测'
        },
        duration: 1, // days
        price: { usd: 1399, rmb: 9853 }, // 1399 USD / 9853 RMB
        reportWaitDays: 7
    }
};

// Attraction data
const attractionsData = {
    beijing: [
        {
            id: 'forbidden-city',
            name: { en: 'Forbidden City', zh: '故宫博物院' },
            description: {
                en: 'Built 1406-1420, home to 24 emperors for nearly 500 years. World\'s largest ancient palace complex with 9999.5 rooms.',
                zh: '建于1406-1420年，近500年来24位皇帝的居所。世界最大的古代宫殿建筑群，拥有9999.5间房屋。'
            },
            duration: 4,
            priceUSD: 8,
            priceRMB: 60,
            image: 'https://images.unsplash.com/photo-1603120527222-33f28c2ce89e?q=80&w=1354&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
        },
        {
            id: 'summer-palace',
            name: { en: 'Summer Palace', zh: '颐和园' },
            description: {
                en: 'UNESCO World Heritage site with royal gardens, Kunming Lake and famous marble boat. Masterpiece of Chinese garden art.',
                zh: '联合国教科文组织世界遗产，拥有皇家园林、昆明湖和著名的石舫。中国园林艺术的杰作。'
            },
            duration: 3,
            priceUSD: 7,
            priceRMB: 50,
            image: 'https://images.unsplash.com/photo-1619825479213-62e158b5a79d?w=700&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fHN1bW1lciUyMHBhbGFjZXxlbnwwfHwwfHx8MA%3D%3D'
        },
        {
            id: 'temple-of-heaven',
            name: { en: 'Temple of Heaven', zh: '天坛' },
            description: {
                en: 'Imperial complex where emperors prayed for good harvests. Famous for its circular Hall of Prayer and Echo Wall.',
                zh: '皇帝祈求丰收的皇家建筑群。以圆形的祈年殿和回音壁而闻名。'
            },
            duration: 2,
            priceUSD: 5,
            priceRMB: 35,
            image: 'assets/images/temple_of_heaven.png'
        },
        {
            id: 'great-wall',
            name: { en: 'Great Wall (Mutianyu)', zh: '长城（慕田峪）' },
            description: {
                en: 'Less crowded section of the Great Wall with cable car access. Stunning mountain views and well-preserved watchtowers.',
                zh: '人流较少的长城段，有缆车通达。壮丽的山景和保存完好的烽火台。'
            },
            duration: 6,
            priceUSD: 6,
            priceRMB: 45,
            image: 'https://plus.unsplash.com/premium_photo-1664304492320-8359efcaad38?q=80&w=2233&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
        },
        {
            id: 'hutong-tour',
            name: { en: 'Hutong Cultural Tour', zh: '胡同文化游' },
            description: {
                en: 'Explore traditional Beijing alleys by rickshaw, visit local family homes, and experience authentic Beijing culture.',
                zh: '乘坐人力车探索传统北京胡同，参观当地家庭，体验正宗的北京文化。'
            },
            duration: 3,
            priceUSD: 17,
            priceRMB: 120,
            image: 'https://images.unsplash.com/photo-1721888664258-54f00f52b147?q=80&w=1335&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
        },
        {
            id: 'beijing-opera',
            name: { en: 'Beijing Opera Show', zh: '京剧表演' },
            description: {
                en: 'Traditional Chinese opera performance with elaborate costumes, makeup, and classical music.',
                zh: '传统中国戏曲表演，华丽的服装、妆容和古典音乐。'
            },
            duration: 2,
            priceUSD: 25,
            priceRMB: 180,
            image: 'https://images.unsplash.com/photo-1743074921223-704aafe873f5?q=80&w=1860&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
        },
        {
            id: 'beijing-palace-banquet',
            name: { en: 'Beijing Imperial Palace Banquet', zh: '北京宫廷宴会' },
            description: {
                en: 'Experience a royal feast in an authentic imperial setting with traditional performances, court cuisine, and period costumes. Immerse yourself in 600 years of palace culture.',
                zh: '在正宗的皇家环境中体验皇室盛宴，包含传统表演、宫廷菜肴和古装服饰。沉浸在600年的宫廷文化中。'
            },
            duration: 2.5,
            priceUSD: 77,
            priceRMB: 548,
            image: 'https://qcloud.dpfile.com/pc/GU81KhgNvsoBo5ri_1T0CzYn_py7LI7ZJXwLp6jcAP-RQmKmKLPEc8Za2iPl8X6FAsjew4BovU6axjPJM2w4nrGzA5roSQdOIZBdpbY56uQFaWqA0j7ta3_A22czT6CvR2wBLHpNWleM8u_F-3h0csaq1-bq6jn4ci07g10pOcR8r-pAC7Z8Me1lmvv-C1rCtuD2Ttc33o2oiy9iGY5KAqS8eU1WRISyVZ5oaCuzdo9GQLj2BUn2Fvl5kTJ57OrBF71mYN0a8QgyjWdwktTu-fYgOcgUCm09oTOzMP3hqp-x0TbmP-QDAyHpIftm1Qa3HFwW-4E8RJFWU33naJoEDq_K_3fzUb4xkJuOOV-RZSUc45Y89_Wwp4ZxBY1BekyTNsZ94K-9pTz-ND1BwuvAA9mpEXrSC_vq7SXOLbSh0F7r_WluI6ZAAXEAIVPzr7aFuae7lo1XId4RfYZA2E9MRlDoqPENHlo17Cy93rHQuC0OboEbo4q9vi3Z3llldIEGOx9i7iIcpl6C2Rcl5UCTNuTgLJj3Tyj37h7BwX8mDNDTtMzAm9Ao1OzMu6UzwwhDcnevFMP8gjC5vn_-sW8cW1E6ydPph68pn_IBwOnU5FwwXQKcVMr19MQGdAcvTpBH.jpg'
        }
    ],
    chengdu: [
        {
            id: 'panda-interaction',
            name: { en: 'Giant Panda Interaction', zh: '大熊猫互动' },
            description: {
                en: 'Unique opportunity to interact with 1-year-old panda cubs. Professional handlers guide you through a 2-minute interaction and photo session.',
                zh: '与1岁左右的熊猫幼崽互动的独特机会。专业饲养员指导您进行2分钟的互动和拍照。'
            },
            duration: 2,
            priceUSD: 1000,
            priceRMB: 7200,
            image: 'https://img20.360buyimg.com/openfeedback/jfs/t1/293098/18/13293/371821/6858c2fdFd18bfc3c/81cfff05979e1541.jpg'
        },
        {
            id: 'panda-volunteer',
            name: { en: 'Panda Volunteer Experience', zh: '熊猫志愿者体验' },
            description: {
                en: 'Full-day volunteer program including enclosure cleaning, bamboo preparation, and educational activities. Receive official volunteer certificate.',
                zh: '全天志愿者项目，包括清理圈舍、准备竹子和教育活动。获得官方志愿者证书。'
            },
            duration: 8.5,
            priceUSD: 500,
            priceRMB: 3600,
            image: 'https://q6.itc.cn/q_70/images03/20250622/305e846be6994a1383ff0a728788efaa.jpeg'
        },
        {
            id: 'panda-base',
            name: { en: 'Giant Panda Research Base', zh: '大熊猫繁育研究基地' },
            description: {
                en: 'World-famous panda conservation center where you can observe giant pandas in their natural habitat.',
                zh: '世界著名的大熊猫保护中心，您可以在自然栖息地观察大熊猫。'
            },
            duration: 3,
            priceUSD: 8,
            priceRMB: 58,
            image: 'assets/images/panda_base.png'
        },
        {
            id: 'qingcheng-mountain',
            name: { en: 'Qingcheng Mountain', zh: '青城山' },
            description: {
                en: 'Birthplace of Taoism, known as the "Fifth Grotto-heaven". Founded by Zhang Daoling in Eastern Han Dynasty. Stay overnight at Yuanming Palace for deep cultural immersion.',
                zh: '道教发源地，被誉为"第五洞天"。东汉张道陵于此创教。可在圆明宫过夜，深度体验道家文化。'
            },
            duration: 6,
            priceUSD: 13,
            priceRMB: 90,
            image: 'https://miaobi-lite.bj.bcebos.com/miaobi/5mao/b%276Z2S5Z%2BO5bGx6KW/5ri46K6w5Y%2BW5pmv5ZywXzE3MjkzODE1NjQuNzY1MzUxNQ%3D%3D%27/0.png'
        },
        {
            id: 'dujiangyan',
            name: { en: 'Dujiangyan Irrigation System', zh: '都江堰水利工程' },
            description: {
                en: 'Ancient irrigation system built in 256 BC, creating the "Land of Abundance". Marvel at the ingenious "Fish Mouth", "Flying Sand Weir", and "Bottle Neck" design.',
                zh: '公元前256年建成的古代水利工程，造就"天府之国"。欣赏巧夺天工的"鱼嘴分水"、"飞沙堰泄洪"、"宝瓶口控流"设计。'
            },
            duration: 4,
            priceUSD: 11,
            priceRMB: 80,
            image: 'https://q8.itc.cn/images01/20250310/c3393ad7d3734ee6971bb477f37cc711.jpeg'
        },
        {
            id: 'wuhou-shrine',
            name: { en: 'Wuhou Shrine', zh: '武侯祠' },
            description: {
                en: 'China\'s only temple dedicated to both emperor and minister, commemorating Liu Bei and Zhuge Liang. Famous for "Red Walls and Bamboo Shadows", adjacent to Jinli Ancient Street.',
                zh: '中国唯一的君臣合祀祠庙，纪念刘备与诸葛亮。以"红墙竹影"著称，紧邻锦里古街。'
            },
            duration: 2,
            priceUSD: 7,
            priceRMB: 50,
            image: 'https://www.wuhouci.net.cn/resources/assets/images/whc2021.jpg'
        },
        {
            id: 'kuanzhai-alley',
            name: { en: 'Kuanzhai Alley', zh: '宽窄巷子' },
            description: {
                en: 'Qing Dynasty hutong heritage consisting of Wide, Narrow, and Well alleys. Blend of Sichuan folk architecture and Western elements, perfect for experiencing Chengdu\'s slow life.',
                zh: '清代胡同遗存，由宽、窄、井三条巷子组成。融合川西民居与西洋元素，是体验成都慢生活的好去处。'
            },
            duration: 2,
            priceUSD: 0,
            priceRMB: 0,
            image: 'assets/images/kuanzhai_alley.png'
        },
        {
            id: 'mahjong-culture',
            name: { en: 'Mahjong Culture Experience', zh: '麻将文化体验' },
            description: {
                en: 'Experience unique "stream mahjong" in Huanglongxi or Dujiangyan Hongkou. Playing mahjong in cool stream water is a distinctive Chengdu summer tradition.',
                zh: '在黄龙溪或都江堰虹口体验独特的"溪水麻将"。在清凉溪水中搓麻将是成都夏季特色。'
            },
            duration: 3,
            priceUSD: 21,
            priceRMB: 150,
            image: 'https://q9.itc.cn/q_70/images03/20240105/03969234cf0f4f20b7d486a790a35dbe.jpeg'
        },
        {
            id: 'palace-banquet',
            name: { en: 'Shu Kingdom Palace Banquet', zh: '蜀国宫庭宴会' },
            description: {
                en: 'Immersive Han-Tang court dining experience with traditional music, bamboo crafts, lacquerware, and live performances. Interactive NPCs and dynamic ancient paintings.',
                zh: '沉浸式汉唐宫廷用餐体验，融合传统音乐、竹编、漆器和现场表演。互动NPC和动态古画展示。'
            },
            duration: 2.5,
            priceUSD: 90,
            priceRMB: 650,
            image: 'https://qcloud.dpfile.com/pc/7vji8Tzrwzf323uT2eVPg81B46zNgPq3DJgtoMu1SISS_XU_ddTspnpsmq2FYaDx.jpg'
        },
        {
            id: 'jinli-street',
            name: { en: 'Jinli Ancient Street', zh: '锦里古街' },
            description: {
                en: 'Historic street with traditional architecture, local snacks, handicrafts, and Sichuan opera performances.',
                zh: '历史悠久的街道，传统建筑、当地小吃、手工艺品和川剧表演。'
            },
            duration: 2,
            priceUSD: 0,
            priceRMB: 0,
            image: 'https://gips1.baidu.com/it/u=2265047180,47231142&fm=3074&app=3074&f=JPEG'
        },
        {
            id: 'sichuan-cuisine',
            name: { en: 'Sichuan Cuisine Experience', zh: '川菜体验' },
            description: {
                en: 'Hands-on cooking class learning to make authentic Sichuan dishes like mapo tofu and kung pao chicken.',
                zh: '亲手学习制作正宗川菜，如麻婆豆腐和宫保鸡丁的烹饪课程。'
            },
            duration: 4,
            priceUSD: 39,
            priceRMB: 280,
            image: 'https://miaobi-lite.bj.bcebos.com/miaobi/5mao/b%276K%2BE5YiG6auY55qE5bed6I%2Bc6aSQ5Y6FXzE3MzQ1Mzk2ODAuMjE4ODk%3D%27/0.png'
        },
        {
            id: 'tea-house',
            name: { en: 'Traditional Tea House', zh: '传统茶馆' },
            description: {
                en: 'Experience Chengdu\'s tea culture with traditional tea ceremony and local snacks in historic tea house.',
                zh: '在历史悠久的茶馆体验成都茶文化，传统茶艺和当地小食。'
            },
            duration: 2,
            priceUSD: 11,
            priceRMB: 80,
            image: 'assets/images/tea_house.png'
        },
        {
            id: 'face-changing',
            name: { en: 'Sichuan Opera Face Changing', zh: '川剧变脸' },
            description: {
                en: 'Watch the mysterious art of face-changing in traditional Sichuan opera performance.',
                zh: '观看川剧传统表演中神秘的变脸艺术。'
            },
            duration: 1.5,
            priceUSD: 17,
            priceRMB: 120,
            image: 'https://qcloud.dpfile.com/pc/_9JFTErgcYwS8UKMf-39hDuvUXA5VgGRg8U9tGLRLkYaYY0PfhlEQ1WPqzILoArg.jpg'
        }
    ]
};
