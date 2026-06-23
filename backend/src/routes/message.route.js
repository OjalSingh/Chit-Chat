import express from 'express';

const router = express.Router();

router.get('/send', (req, res) => {
    res.send('Send message route');
});

router.get('/receive', (req, res) => {
    res.send('Receive message route');
});

export default router;