const Profile = require('../models/Profile');
const { getCaretakerPatients, addAssignmentNote } = require('../services/caretakerService');
const { escapeRegex } = require('../utils/escapeRegex');

/**
 * GET /api/caretakers
 * Get caretakers with role-based access control
 */
exports.listCaretakers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query for caretakers only
    let query = {
      role: 'caretaker',
      ...req.scopeFilter
    };

    // Apply search filter
    if (search) {
      query.$or = [
        { fullName: { $regex: escapeRegex(search), $options: 'i' } },
        { email: { $regex: escapeRegex(search), $options: 'i' } },
        { phone: { $regex: escapeRegex(search), $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const caretakers = await Profile.find(query)
      .populate('organizationId', 'name type')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count
    const total = await Profile.countDocuments(query);

    res.json({
      caretakers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get caretakers error:', error);
    res.status(500).json({
      error: 'Failed to get caretakers',
      details: error.message
    });
  }
};

/**
 * GET /api/caretakers/:id
 * Get specific caretaker with role-based access
 */
exports.getCaretaker = async (req, res) => {
  try {
    const caretakerId = req.params.id;

    // Check access permissions based on role
    const { role } = req.profile;
    let canAccess = false;

    // Super admin can access all caretakers
    if (role === 'super_admin') {
      canAccess = true;
    }

    // Org admin and care manager can access caretakers in their organization
    else if (['org_admin', 'care_manager'].includes(role)) {
      const caretaker = await Profile.findById(caretakerId);
      if (caretaker && caretaker.organizationId && req.profile.organizationId) {
          const ctOrgId = typeof caretaker.organizationId === 'object' ? (caretaker.organizationId._id || caretaker.organizationId).toString() : String(caretaker.organizationId);
          const myOrgId = typeof req.profile.organizationId === 'object' ? (req.profile.organizationId._id || req.profile.organizationId).toString() : String(req.profile.organizationId);
          canAccess = ctOrgId === myOrgId;
      }
    }

    // Caretaker can access their own profile
    else if (role === 'caretaker') {
      canAccess = req.profile._id.toString() === caretakerId;
    }

    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied to this caretaker' });
    }

    // Get caretaker details
    const caretaker = await Profile.findById(caretakerId)
      .populate('organizationId', 'name type settings');

    if (!caretaker || !['caretaker', 'caller', 'care_manager'].includes(caretaker.role)) {
      return res.status(404).json({ error: 'Caretaker not found' });
    }

    res.json(caretaker);

  } catch (error) {
    console.error('Get caretaker error:', error);
    res.status(500).json({
      error: 'Failed to get caretaker',
      details: error.message
    });
  }
};

/**
 * GET /api/caretakers/:id/patients
 * Get all patients assigned to a caretaker
 */
exports.getCaretakerPatientsList = async (req, res) => {
  try {
    const caretakerId = req.params.id;
    const { includeInactive = false } = req.query;

    // Check access permissions
    const { role } = req.profile;
    let canAccess = false;

    if (role === 'super_admin') {
      canAccess = true;
    } else if (['org_admin', 'care_manager'].includes(role)) {
      const caretaker = await Profile.findById(caretakerId);
      if (caretaker && caretaker.organizationId && req.profile.organizationId) {
          const ctOrgId = typeof caretaker.organizationId === 'object' ? (caretaker.organizationId._id || caretaker.organizationId).toString() : String(caretaker.organizationId);
          const myOrgId = typeof req.profile.organizationId === 'object' ? (req.profile.organizationId._id || req.profile.organizationId).toString() : String(req.profile.organizationId);
          canAccess = ctOrgId === myOrgId;
      }
    } else if (['caretaker', 'caller'].includes(role)) {
      canAccess = req.profile._id.toString() === caretakerId; // Caretaker/Caller checking their own assignments
    }

    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied to this caretaker' });
    }

    const patients = await getCaretakerPatients(req.profile, caretakerId, {
      includeInactive: includeInactive === 'true'
    });

    res.json({ patients });

  } catch (error) {
    console.error('Get caretaker patients error:', error);
    res.status(500).json({
      error: 'Failed to get caretaker patients',
      details: error.message
    });
  }
};

/**
 * POST /api/caretakers/:id/patients/:patientId/notes
 * Add note to caretaker-patient assignment
 */
exports.addCaretakerPatientNote = async (req, res) => {
  try {
    const { id: caretakerId, patientId } = req.params;
    const { content, isPrivate = false } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Note content is required'
      });
    }

    const assignment = await addAssignmentNote(
      req.profile,
      caretakerId,
      patientId,
      content.trim(),
      isPrivate
    );

    res.status(201).json({
      message: 'Note added successfully',
      assignment
    });

  } catch (error) {
    console.error('Add assignment note error:', error);
    res.status(400).json({
      error: 'Failed to add note',
      details: error.message
    });
  }
};
