const express = require('express');
const Record = require('../models/Record');
const Employee = require('../models/Employee');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
const router = express.Router();


function buildRecordsPipeline(matchConditions = {}) {
  return [
    ...(Object.keys(matchConditions).length > 0 ? [{ '$match': matchConditions }] : []),
    
    {
      '$lookup': {
        'from': 'employees', 
        'localField': 'employeeId', 
        'foreignField': '_id', 
        'as': 'employee'
      }
    },
    {
      '$unwind': '$employee'
    },
    {
      '$addFields': {
        'dateOnly': {
          '$dateToString': {
            'format': '%Y-%m-%d',
            'date': '$timestamp'
          }
        }
      }
    },
    {
      '$sort': {
        'dateOnly': -1,
        'employee._id': 1,
        'timestamp': -1
      }
    },
    {
      '$group': {
        '_id': '$employee._id',
        'employee_info': { '$first': '$employee' },
        'records': {
          '$push': {
            'timestamp': '$timestamp',
            'type': '$type',
            'recordId': '$_id',
            'dateOnly': '$dateOnly'
          }
        },
        'total_records': { '$sum': 1 }
      }
    },
    {
      '$unwind': '$records'
    },
    {
      '$project': {
        '_id': '$records.recordId',
        'timestamp': '$records.timestamp',
        'type': '$records.type',
        'employee': '$employee_info',
        'employeeId': '$_id',
        'dateOnly': '$records.dateOnly'
      }
    },
    {
      '$sort': {
        'dateOnly': -1,
        'employee._id': 1,
        'timestamp': 1
      }
    }
  ];
}

router.get('/reports', async (req, res) => {
  const employees = await Employee.find().select('code name').sort({ name: 1 });
  res.render('reports', { employees, records: null, filters: {} });
});


router.post('/reports', async (req, res) => {
  const { startDate, endDate, employeeId } = req.body;
  const filters = { startDate, endDate, employeeId };


  let matchConditions = {};
  
  if (startDate || endDate) {
    matchConditions.timestamp = {};
    if (startDate) {
      matchConditions.timestamp.$gte = new Date(startDate + 'T00:00:00.000Z');
    }
    if (endDate) {
      matchConditions.timestamp.$lte = new Date(endDate + 'T23:59:59.999Z');
    }
  }
  
  if (employeeId) {
    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      matchConditions.employeeId = new mongoose.Types.ObjectId(employeeId);
    }
  }

  const pipeline = buildRecordsPipeline(matchConditions);
  const records = await Record.aggregate(pipeline);

  const employees = await Employee.find().select('code name').sort({ name: 1 });
  res.render('reports', { employees, records, filters });
});


router.post('/reports/export', async (req, res) => {
  const { startDate, endDate, employeeId } = req.body;


  let matchConditions = {};
  
  if (startDate || endDate) {
    matchConditions.timestamp = {};
    if (startDate) {
      matchConditions.timestamp.$gte = new Date(startDate + 'T00:00:00.000Z');
    }
    if (endDate) {
      matchConditions.timestamp.$lte = new Date(endDate + 'T23:59:59.999Z');
    }
  }
  
  if (employeeId) {
    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      matchConditions.employeeId = new mongoose.Types.ObjectId(employeeId);
    }
  }

  const pipeline = buildRecordsPipeline(matchConditions);
  const records = await Record.aggregate(pipeline);


  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Registros de Marcaciones');
  

  ws.columns = [
    { header: 'Fecha y Hora', key: 'timestamp', width: 20 },
    { header: 'Fecha', key: 'date', width: 12 },
    { header: 'Hora', key: 'time', width: 10 },
    { header: 'Código Empleado', key: 'code', width: 15 },
    { header: 'Nombre Empleado', key: 'name', width: 25 },
    { header: 'Tipo de Marcación', key: 'type', width: 18 }
  ];


  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  ws.getRow(1).font.color = { argb: 'FFFFFFFF' };


  records.forEach(r => {
    const date = new Date(r.timestamp);
    

    let typeSpanish = '';
    switch(r.type) {
      case 'in': typeSpanish = 'Entrada'; break;
      case 'out': typeSpanish = 'Salida'; break;
      case 'lunchOut': typeSpanish = 'Salida Almuerzo'; break;
      case 'lunchIn': typeSpanish = 'Regreso Almuerzo'; break;
      default: typeSpanish = r.type;
    }

    ws.addRow({
      timestamp: date.toLocaleString('es-ES'),
      date: date.toLocaleDateString('es-ES'),
      time: date.toLocaleTimeString('es-ES'),
      code: r.employee.code,
      name: r.employee.name,
      type: typeSpanish
    });
  });

  // Add borders to all cells
  ws.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  ws.eachRow((row, rowNumber) => {
    if (rowNumber > 1) { // Skip header
      const typeCell = row.getCell(6);
      switch(typeCell.value) {
        case 'Entrada':
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
          break;
        case 'Salida':
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
          break;
        case 'Salida Almuerzo':
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEAA7' } };
          break;
        case 'Regreso Almuerzo':
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1ECF1' } };
          break;
      }
    }
  });

  ws.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, cell => {
      if (cell.value) {
        maxLength = Math.max(maxLength, cell.value.toString().length);
      }
    });
    column.width = Math.min(Math.max(maxLength + 2, 10), 50);
  });

  const filename = `marcaciones_${startDate || 'inicio'}_a_${endDate || 'fin'}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  await wb.xlsx.write(res);
  res.end();
});

module.exports = router;