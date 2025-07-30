const express    = require('express');
const router     = express.Router();
const { isAuthenticated, isAdmin } = require('../middlewares/auth');
const Employee   = require('../models/Employee');
const Schedule   = require('../models/Schedule');
const Record     = require('../models/Record');
const moment     = require('moment');
const mongoose = require('mongoose');

// Protección
router.use(isAuthenticated, isAdmin);

// Dashboard
router.get('/admin', (req, res) => res.render('admin/dashboard'));

// Incidencia
router.get('/admin/incidencias', (req, res) => {
  res.render('admin/Incidencias');
});

// CRUD Empleados
router.get('/admin/employees', async (req, res) => {
  const list = await Employee.find().populate('scheduleId');
  res.render('admin/employees', { list });
});
router.get('/admin/employees/new', async (req, res) => {
  const schedules = await Schedule.find();
  res.render('admin/employee_form', { emp: null, schedules });
});
router.post('/admin/employees', async (req, res) => {
  await Employee.create(req.body);
  res.redirect('/admin/employees');
});
router.get('/admin/employees/:id/edit', async (req, res) => {
  const emp = await Employee.findById(req.params.id);
  const schedules = await Schedule.find();
  res.render('admin/employee_form', { emp, schedules });
});
router.put('/admin/employees/:id', async (req, res) => {
  await Employee.findByIdAndUpdate(req.params.id, req.body);
  res.redirect('/admin/employees');
});
router.delete('/admin/employees/:id', async (req, res) => {
  await Employee.findByIdAndDelete(req.params.id);
  res.redirect('/admin/employees');
});

// CRUD Horarios
router.get('/admin/schedules', async (req, res) => {
  const list = await Schedule.find();
  res.render('admin/schedules', { list });
});
router.get('/admin/schedules/new', (req, res) => res.render('admin/schedule_form', { sch: null }));
router.post('/admin/schedules', async (req, res) => {
  await Schedule.create(req.body);
  res.redirect('/admin/schedules');
});
router.get('/admin/schedules/:id/edit', async (req, res) => {
  const sch = await Schedule.findById(req.params.id);
  res.render('admin/schedule_form', { sch });
});
router.put('/admin/schedules/:id', async (req, res) => {
  await Schedule.findByIdAndUpdate(req.params.id, req.body);
  res.redirect('/admin/schedules');
});
router.delete('/admin/schedules/:id', async (req, res) => {
  await Schedule.findByIdAndDelete(req.params.id);
  res.redirect('/admin/schedules');
});

// Revisión de Marcaciones
// router.get('/admin/records', async (req, res) => {
//   const recs = await Record.find().sort({ timestamp:-1 }).populate({ path:'employeeId', select:'code name' });
//   res.render('admin/records', { recs });
// });

router.get('/admin/records', async (req, res) => {
  const { startDate, endDate, employeeId } = req.query;
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
    matchConditions.employeeId = new mongoose.Types.ObjectId(employeeId);
  }

  const agg = [];

  if (Object.keys(matchConditions).length > 0) {
  agg.push({ '$match': matchConditions });
}
  agg.push(
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
  },{
      '$addFields': {
        'dateOnly': {
          '$dateToString': {
            'format': '%Y-%m-%d',
            'date': '$timestamp'
          }
        }
      }
    },{
    '$sort': {
      'dateOnly': -1,        // Group by date first (newest first)
      'employee._id': 1,
      'timestamp': -1
    }
  }, {
    '$group': {
      '_id': '$employee._id', 
      'employee_info': {
        '$first': '$employee'
      }, 
      'total_record': {
        '$sum': 1
      }, 
      'records_found': {
        '$push': {
          'dateOnly': '$dateOnly',
          'timestamp': '$timestamp', 
          'stamp_type': '$type',
          'recordId': '$_id'
        }
      }
    }
  },{
    '$unwind': '$records_found'
  },{
    '$project': {
        '_id': '$records_found.recordId',
        'dateOnly': '$records_found.dateOnly',
        'timestamp': '$records_found.timestamp',
        'type': '$records_found.stamp_type',
        'employee': '$employee_info',
        'employeeId': '$_id'
    }
  },{
      '$sort': {
        'dateOnly': -1,        // Maintain date grouping (newest first)
        'employee._id': 1,
        'timestamp': -1,
      }
    });

  const employees = await Employee.find({}).sort({ name: 1 });  
  const recs = await Record.aggregate(agg);
  res.render('admin/records', { recs, employees, filters: { startDate, endDate, employeeId } });
});

router.get('/admin/stats', isAuthenticated, isAdmin, async (req, res) => {
  // Ejemplo: calcular totales por día de la última semana
  const end = moment().endOf('day');
  const start = moment().subtract(6, 'days').startOf('day');
  
  const recs = await Record.find({
    timestamp: { $gte: start.toDate(), $lte: end.toDate() }
  }).populate('employeeId','code');

  // Agrupar por fecha y tipo
  const days = {};
  for (let m = start.clone(); m.isSameOrBefore(end); m.add(1,'day')) {
    days[m.format('YYYY-MM-DD')] = { tardanzas:0, extras:0 };
  }
  recs.forEach(r => {
    const day = moment(r.timestamp).format('YYYY-MM-DD');
    // lógica simplificada: si type==='in' y es tarde, cuenta tardanza
    const hr = moment(r.timestamp);
    // supón horario 08:00
    if (r.type==='in' && hr.isAfter(moment(`${day} 08:00`))) {
      days[day].tardanzas++;
    }
    // si type==='out' y sale después de 17:00, cuenta hora extra
    if (r.type==='out' && hr.isAfter(moment(`${day} 17:00`))) {
      days[day].extras++;
    }
  });

  // Preparar arrays para Chart.js
  const labels = Object.keys(days);
  const dataT = labels.map(d => days[d].tardanzas);
  const dataE = labels.map(d => days[d].extras);

  res.json({ labels, dataT, dataE });
});

// 2) Eventos para FullCalendar
router.get('/admin/calendar-events', isAuthenticated, isAdmin, async (req,res) => {
  // Para cada día del mes actual sacar estado global (si al menos un empleado tardó se marca en rojo, etc.)
  const start = moment().startOf('month');
  const end   = moment().endOf('month');
  const recs  = await Record.find({
    timestamp: { $gte: start.toDate(), $lte: end.toDate() }
  }).populate('employeeId','code');
  
  const days = {};
  recs.forEach(r => {
    const day = moment(r.timestamp).format('YYYY-MM-DD');
    if (!days[day]) days[day] = { tardanza:false, temprana:false };
    if (r.type==='in' && moment(r.timestamp).isAfter(moment(`${day} 08:00`))) days[day].tardanza = true;
    if (r.type==='out' && moment(r.timestamp).isBefore(moment(`${day} 17:00`))) days[day].temprana = true;
  });

  // Generar eventos para FullCalendar
  const events = Object.entries(days).map(([date, st]) => ({
    title: st.tardanza ? 'Tardanza' : st.temprana ? 'Salida temprana' : 'OK',
    start: date,
    allDay: true,
    color: st.tardanza ? 'red' : st.temprana ? 'orange' : 'green'
  }));

  res.json(events);
});

module.exports = router;