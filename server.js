// modullarni import qilib olamiz
const express = require('express');
const responseTime = require('response-time')
const axios = require('axios');
const redis = require('redis');

const app = express();

// lokal kompyuterdagi redisga ulanamiz
const client = redis.createClient();

// redisdagi xatolarni konsolga yozamiz
client.on('error', (err) => {
    console.log("Error " + err);
});

// response-time ni middleware sifatida ishlatamiz
app.use(responseTime());


// api/search route'ni qo'shamiz
app.get('/api/search', (req, res) => {
    // url dan so'rovni olamiz va probellarni olib tashlaymiz
    const query = (req.query.query).trim();
    // Wikipedia API URL manzilini tayyorlab olamiz
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=parse&format=json&section=0&page=${query}`;

    // Natijani avvalo Redis dan kalit yordamida olib ko'ramiz
    return client.get(`wikipedia:${query}`, (err, result) => {
        // agarda u kalit redisda bor bo'lsa uni jsonga o'girib, mijozga qaytarib beramiz
        if (result) {
            const resultJSON = JSON.parse(result);
            return res.status(200).json(resultJSON);
        } else { // Agarda u kalit Redis'da mavjud bo'lmasa
            // uni axios yordamida Wikipedia API'dan olamiz:
            return axios.get(searchUrl)
                .then(response => {
                    const responseJSON = response.data;
                    // Wikipedia API dan kelgan javobni Redis'ga saqlab qo'yamiz
                    client.setex(`wikipedia:${query}`, 3600, JSON.stringify({ source: 'Redis Cache', ...responseJSON, }));
                    // JSON javobni mijozga qaytarib beramiz
                    return res.status(200).json({ source: 'Wikipedia API', ...responseJSON, });
                })
                .catch(err => {
                    return res.json(err);
                });
        }
    });
});

app.listen(3000, () => {
    console.log('Server ushbu portda eshityapti: ', 3000);
});