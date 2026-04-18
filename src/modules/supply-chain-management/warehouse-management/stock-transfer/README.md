# Stock Transfer Module Structure

This module handles the full lifecycle of stock transfers:
1. **Request**: Source creation.
2. **Approval**: Warehouse manager authorization.
3. **Dispatch**: RFID scanning and pickup at source.
4. **Receive**: RFID verification and deposit at target.

## Directory Layout (Planned)

- `components/`: Feature-specific UI fragments and common components.
- `hooks/`: Domain logic encapsulated in specialized hooks.
- `services/`: API communication, business rules, and mapping.
- `types/`: Zod schemas and TypeScript interfaces.
- `views/`: The entry point components for each phase.
