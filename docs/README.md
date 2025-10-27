# Documentation Index

This directory contains comprehensive documentation for the Umrah & Hajj Real-time Application.

## Documentation Structure

### Technical Pack (Core Documentation)
Located in `umrah_tech_pack_v1/`:

#### Project & Planning
- [01_project_overview.md](./umrah_tech_pack_v1/01_project_overview.md) - Project vision and objectives
- [02_functional_spec.md](./umrah_tech_pack_v1/02_functional_spec.md) - Feature specifications
- [10_roadmap.md](./umrah_tech_pack_v1/10_roadmap.md) - Development roadmap

#### Technical Architecture
- [03_technical_spec.md](./umrah_tech_pack_v1/03_technical_spec.md) - System architecture
- [04_architecture_diagram.md](./umrah_tech_pack_v1/04_architecture_diagram.md) - Visual architecture
- [09_code_structure.md](./umrah_tech_pack_v1/09_code_structure.md) - Codebase organization

#### API & Integration
- [07_api_reference.yaml](./umrah_tech_pack_v1/07_api_reference.yaml) - OpenAPI specification
- [07b_ws_events.json](./umrah_tech_pack_v1/07b_ws_events.json) - WebSocket events schema
- [06_ai_model_spec.md](./umrah_tech_pack_v1/06_ai_model_spec.md) - AI integration specification

#### Data & Storage
- [08_database_schema.sql](./umrah_tech_pack_v1/08_database_schema.sql) - Database structure
- [18_ritual_state_machine.json](./umrah_tech_pack_v1/18_ritual_state_machine.json) - State management
- [19_offline_packs_manifest.json](./umrah_tech_pack_v1/19_offline_packs_manifest.json) - Offline content

#### Deployment & Operations
- [05_deployment_plan.md](./umrah_tech_pack_v1/05_deployment_plan.md) - Infrastructure & deployment
- [12_cicd_guide.md](./umrah_tech_pack_v1/12_cicd_guide.md) - CI/CD procedures
- [11_qa_plan.md](./umrah_tech_pack_v1/11_qa_plan.md) - Quality assurance

#### Compliance & Content
- [13_security_privacy.md](./umrah_tech_pack_v1/13_security_privacy.md) - Security measures
- [15_content_licensing.md](./umrah_tech_pack_v1/15_content_licensing.md) - Content licensing
- [16_consent_copy.md](./umrah_tech_pack_v1/16_consent_copy.md) - User consent
- [17_fiqh_rules_matrix.md](./umrah_tech_pack_v1/17_fiqh_rules_matrix.md) - Religious guidance rules

#### Platform Specific
- [20_unity_packages.md](./umrah_tech_pack_v1/20_unity_packages.md) - Unity development
- [14_dev_onboarding.md](./umrah_tech_pack_v1/14_dev_onboarding.md) - Developer setup

### Authentication System
Located in `authentication/`:

**Complete authentication system documentation** - Supabase JWT, mock auth, WebSocket auth, security features

- [README.md](./authentication/README.md) - Complete authentication guide (30 min)
- [QUICK_START.md](./authentication/QUICK_START.md) - 5-minute setup guide
- [API_REFERENCE.md](./authentication/API_REFERENCE.md) - API endpoint reference
- [SECURITY_IMPLEMENTATION.md](./authentication/SECURITY_IMPLEMENTATION.md) - Security details
- [INDEX.md](./authentication/INDEX.md) - Documentation navigation

**Quick Links:**
- 🚀 [Setup in 5 minutes](./authentication/QUICK_START.md)
- 📖 [Complete guide](./authentication/README.md)
- 🔐 [Security details](./authentication/SECURITY_IMPLEMENTATION.md)

### Operations Runbooks
Located in `runbooks/`:

#### Deployment Procedures
- [deploy_staging.md](./runbooks/deploy_staging.md) - Staging deployment guide
- [rollback.md](./runbooks/rollback.md) - Emergency rollback procedures

#### Incident Response
- [incident_ws.md](./runbooks/incident_ws.md) - WebSocket troubleshooting
- [db_restore.md](./runbooks/db_restore.md) - Database recovery procedures
- [README.md](./runbooks/README.md) - Operations quick reference

### Research & Analysis
Located in `research/`:
- Contains research documents, analysis, and experimental documentation

## Content Licensing

### Qur'an Content
All Qur'anic content is properly licensed and attributed:
- **Arabic Text**: Tanzil.net (CC BY 3.0) - See [assets/quran/NOTICE](../assets/quran/NOTICE)
- **English Translation**: Pickthall (Public Domain)
- **Attribution**: Maintained in application and documentation

### Application Documentation
- Technical documentation: Created for this project
- Code examples: Follow project licensing terms
- External references: Properly attributed with source links

## Quick Start Guides

### For Developers
1. **Authentication Setup**: [authentication/QUICK_START.md](./authentication/QUICK_START.md) - 5 minutes ⭐
2. Read [14_dev_onboarding.md](./umrah_tech_pack_v1/14_dev_onboarding.md)
3. Review [03_technical_spec.md](./umrah_tech_pack_v1/03_technical_spec.md)
4. Check [07_api_reference.yaml](./umrah_tech_pack_v1/07_api_reference.yaml) for API details
5. See [../DEVELOPMENT_SETUP.md](../DEVELOPMENT_SETUP.md) for environment setup

### For Operations
1. **Authentication & Security**: [authentication/README.md](./authentication/README.md) - Deployment guide ⭐
2. Review [05_deployment_plan.md](./umrah_tech_pack_v1/05_deployment_plan.md)
3. Familiarize with [runbooks/](./runbooks/) procedures
4. Check [12_cicd_guide.md](./umrah_tech_pack_v1/12_cicd_guide.md) for CI/CD
5. Review [13_security_privacy.md](./umrah_tech_pack_v1/13_security_privacy.md)
6. Check [SECURITY_HEADERS.md](./SECURITY_HEADERS.md) for security headers

### For QA & Testing
1. Read [11_qa_plan.md](./umrah_tech_pack_v1/11_qa_plan.md)
2. Review [02_functional_spec.md](./umrah_tech_pack_v1/02_functional_spec.md)
3. Check test coverage reports in backend
4. Validate against [17_fiqh_rules_matrix.md](./umrah_tech_pack_v1/17_fiqh_rules_matrix.md)

### For Product Management
1. Start with [01_project_overview.md](./umrah_tech_pack_v1/01_project_overview.md)
2. Review [10_roadmap.md](./umrah_tech_pack_v1/10_roadmap.md)
3. Check [02_functional_spec.md](./umrah_tech_pack_v1/02_functional_spec.md)
4. Understand compliance requirements in [15_content_licensing.md](./umrah_tech_pack_v1/15_content_licensing.md)

## API Documentation

### Swagger/OpenAPI
The complete API specification is available in:
- **File**: [07_api_reference.yaml](./umrah_tech_pack_v1/07_api_reference.yaml)
- **Live Documentation**: https://api.umrah.example.com/docs (when deployed)

### Key Endpoints

#### Qur'an Content API
- `GET /content/quran/chapter/{chapter_number}` - Get Surah content
- `GET /content/quran/verse/{chapter}/{verse}` - Get specific verse
- `GET /content/quran/search` - Search Qur'an content

#### Navigation & Location
- `GET /content/qibla` - Calculate Qibla direction
- `GET /content/prayer-times` - Get prayer times
- `WebSocket /nav/ws` - Real-time navigation updates

#### User Management
- `POST /auth/signup` - User registration
- `POST /auth/login` - User authentication
- `GET /profile` - User profile management
- `PUT /consent` - Update consent preferences

### WebSocket Events
Real-time events are documented in [07b_ws_events.json](./umrah_tech_pack_v1/07b_ws_events.json)

## Security & Compliance

### Data Protection
- GDPR compliance procedures in [13_security_privacy.md](./umrah_tech_pack_v1/13_security_privacy.md)
- User consent management in [16_consent_copy.md](./umrah_tech_pack_v1/16_consent_copy.md)
- Content licensing compliance in [15_content_licensing.md](./umrah_tech_pack_v1/15_content_licensing.md)

### Religious Compliance
- Fiqh rules and guidelines in [17_fiqh_rules_matrix.md](./umrah_tech_pack_v1/17_fiqh_rules_matrix.md)
- Proper attribution of Islamic content
- Respectful handling of religious data

## Maintenance & Updates

### Documentation Updates
- Review quarterly or after major releases
- Update API documentation with code changes
- Validate runbooks during incident responses
- Keep licensing information current

### Version Control
All documentation is version controlled with the main codebase to ensure consistency between code and documentation.

## Support & Contact

### Technical Issues
- Check [runbooks/](./runbooks/) for operational procedures
- Review [troubleshooting guides](./runbooks/incident_ws.md) for common issues
- Contact development team for code-related questions

### Content & Licensing
- Refer to [15_content_licensing.md](./umrah_tech_pack_v1/15_content_licensing.md)
- Check [assets/quran/NOTICE](../assets/quran/NOTICE) for attribution requirements
- Contact legal team for licensing questions

---

**Last Updated**: October 27, 2025
**Documentation Version**: 1.1.0 (Added authentication documentation)