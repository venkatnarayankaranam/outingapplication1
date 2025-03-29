import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    padding: 30,
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderStyle: 'solid',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
  },
  tableCell: {
    width: '16.66%',
    borderStyle: 'solid',
    borderRightWidth: 1,
    padding: 5,
    fontSize: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 10,
    textAlign: 'center',
  },
});

interface ApprovedStudentsPDFProps {
  students: Array<{
    name: string;
    rollNumber: string;
    floor: string;
    roomNumber: string;
    outTime: string;
    inTime: string;
  }>;
}

export const ApprovedStudentsPDF = ({ students }: ApprovedStudentsPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>Approved Students List</Text>
      
      <View style={styles.table}>
        {/* Table Header */}
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={styles.tableCell}>Name</Text>
          <Text style={styles.tableCell}>Roll Number</Text>
          <Text style={styles.tableCell}>Floor</Text>
          <Text style={styles.tableCell}>Room</Text>
          <Text style={styles.tableCell}>Out Time</Text>
          <Text style={styles.tableCell}>In Time</Text>
        </View>

        {/* Table Body */}
        {students.map((student, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.tableCell}>{student.name}</Text>
            <Text style={styles.tableCell}>{student.rollNumber}</Text>
            <Text style={styles.tableCell}>{student.floor}</Text>
            <Text style={styles.tableCell}>{student.roomNumber}</Text>
            <Text style={styles.tableCell}>{student.outTime}</Text>
            <Text style={styles.tableCell}>{student.inTime}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.footer}>
        Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
      </Text>
    </Page>
  </Document>
);
