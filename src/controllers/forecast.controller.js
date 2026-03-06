// src/controllers/forecast.controller.js
const axios = require('axios');

const PREDICTION_API_URL =
  (process.env.PREDICTION_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
const PREDICTION_API_TIMEOUT_MS = Number(
  process.env.PREDICTION_API_TIMEOUT_MS || 30000
);

exports.predictPrices = async (req, res) => {
  try {
    // Accept both camelCase and snake_case from frontend
    const { commodity, region, weeksAhead, weeks_ahead, weather } = req.body;

    if (!commodity || !region) {
      return res
        .status(400)
        .json({ success: false, message: 'commodity and region are required' });
    }

    const weeks = weeksAhead ?? weeks_ahead ?? 1;

    if (weeks < 1 || weeks > 4) {
      return res.status(400).json({
        success: false,
        message: 'weeksAhead must be between 1 and 4',
      });
    }

    const flaskBody = {
      commodity,
      region,
      weeks_ahead: weeks, // this is what Flask expects
      weather: weather || undefined,
    };

    const flaskRes = await axios.post(`${PREDICTION_API_URL}/predict`, flaskBody, {
      timeout: PREDICTION_API_TIMEOUT_MS,
    });

    return res.status(200).json(flaskRes.data);
  } catch (error) {
    console.error('Forecast error:', error?.response?.data || error.message);

    if (error.response) {
      return res.status(error.response.status || 500).json(error.response.data);
    }

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        success: false,
        message: `Forecast service timed out after ${PREDICTION_API_TIMEOUT_MS}ms`,
      });
    }

    return res
      .status(500)
      .json({ success: false, message: 'Forecast service unavailable' });
  }
};

exports.getCommodities = async (_req, res) => {
  try {
    const flaskRes = await axios.get(`${PREDICTION_API_URL}/commodities`, {
      timeout: PREDICTION_API_TIMEOUT_MS,
    });
    return res.status(200).json(flaskRes.data);
  } catch (error) {
    console.error('Get commodities error:', error?.response?.data || error.message);
    if (error.response) {
      return res.status(error.response.status || 500).json(error.response.data);
    }

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        success: false,
        message: `Forecast service timed out after ${PREDICTION_API_TIMEOUT_MS}ms`,
      });
    }

    return res
      .status(500)
      .json({ success: false, message: 'Forecast service unavailable' });
  }
};

exports.getRegions = async (_req, res) => {
  try {
    const flaskRes = await axios.get(`${PREDICTION_API_URL}/regions`, {
      timeout: PREDICTION_API_TIMEOUT_MS,
    });
    return res.status(200).json(flaskRes.data);
  } catch (error) {
    console.error('Get regions error:', error?.response?.data || error.message);
    if (error.response) {
      return res.status(error.response.status || 500).json(error.response.data);
    }

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        success: false,
        message: `Forecast service timed out after ${PREDICTION_API_TIMEOUT_MS}ms`,
      });
    }

    return res
      .status(500)
      .json({ success: false, message: 'Forecast service unavailable' });
  }
};