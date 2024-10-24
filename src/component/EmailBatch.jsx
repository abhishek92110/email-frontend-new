import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const EmailBatch = () => {
    const [csvFile, setCsvFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [responseData, setResponseData] = useState([])
    const [showData, setShowData] = useState([])
    const [filterStatus, setFilterStatus] = useState(false)
    const [batchStatus, setBatchStatus] = useState(false)
    let email;

    // Handle file input change
    const handleFileChange = (event) => {
        setCsvFile(event.target.files[0]);
    };

    const s2ab = (s) => {
        const buf = new ArrayBuffer(s.length); // Create a buffer
        const view = new Uint8Array(buf); // Create a view into the buffer
        for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF; // Fill the view with the binary data
        return buf;
    };
    
    const handleDownload = () => {
        // Create a worksheet from showData
        const worksheet = XLSX.utils.json_to_sheet(showData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Email Data");
    
        // Generate binary string representation of the workbook
        const binaryString = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
    
        // Convert the binary string to a Blob
        const blob = new Blob([s2ab(binaryString)], { type: "application/octet-stream" });
    
        // Use FileSaver to save the Blob as a file
        saveAs(blob, 'email-validation-results.xlsx');
    };


    const filterData = (value)=>{
        setFilterStatus(true)

        if(value!="No"){
            let tempData = responseData.filter(data=>{
                return data.deliverable==value
            })

            setShowData(tempData)
        }

        else{

            let tempData = responseData.filter(data=>{
                return (data.deliverable==value || (!data.deliverable))
            })

            setShowData(tempData)
        }

    }

    const getEmail = (value)=>{
        email = value
        console.log("value =",email)
    }

    // Handle form submission
    // const handleVerify = async () => {
    //     if (!csvFile) {
    //         console.error("No file selected");
    //         return;
    //     }

    //     const formData = new FormData();
    //     formData.append('file', csvFile);

    //     setLoading(true);

    //     try {
    //         const response = await fetch('http://localhost:8000/validate-emails', {
    //             method: 'POST',
    //             body: formData,
    //         });
    //         const data = await response.json();
    //         console.log('Response:', data);
    //         setResponseData(data.results)
    //         setShowData(data.results)
    //     } catch (error) {
    //         console.error('Error uploading file:', error);
    //     } finally {
    //         setLoading(false);
    //     }
    // };



// const handleVerify = async () => {
//     if (!csvFile) {
//         console.error("No file selected");
//         return;
//     }

//     setLoading(true);

//         try {
//             const response = await fetch('http://localhost:5500/validate-emails', {
//                 method: 'POST',
//                 body: formData,
//             });
//             const data = await response.json();
//             console.log('Response:', data);
//             setResponseData(data.results)
//             setShowData(data.results)
//         } catch (error) {
//             console.error('Error uploading file:', error);
//         } finally {
//             setLoading(false);
//         }
//     };


const handleVerify = async () => {
    if (!csvFile) {
        console.error("No file selected");
        return;
    }

    setLoading(true);

    try {
        // Step 1: Parse the file to extract emails (CSV or Excel)
        const emails = await extractEmailsFromFile(csvFile);

        // Step 2: Process emails in batches of 4
        const batchSize = 4;
        for (let i = 0; i < emails.length; i += batchSize) {
            const emailBatch = emails.slice(i, i + batchSize); // Batch of 4 emails

            // Send batch to API
            await sendBatchToApi(emailBatch);
        }

    } catch (error) {
        console.error('Error processing file:', error);
    } finally {
        setLoading(false);
    }
};

// Function to extract emails from CSV or Excel file
const extractEmailsFromFile = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const binaryStr = event.target.result;

            const fileExtension = file.name.split('.').pop().toLowerCase();
            let emails = [];

            // Step 1: Check if the file is CSV or Excel and parse accordingly
            if (fileExtension === 'csv') {
                const workbook = XLSX.read(binaryStr, { type: 'binary', raw: true });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                emails = data.flat().filter(item => typeof item === 'string' && item.includes('@'));
            } else if (fileExtension === 'xlsx') {
                const workbook = XLSX.read(binaryStr, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                emails = data.flat().filter(item => typeof item === 'string' && item.includes('@'));
            } else {
                reject('Unsupported file type');
                return;
            }

            resolve(emails); // Resolve with extracted emails
        };
        reader.onerror = (err) => reject(err);
        reader.readAsBinaryString(file);
    });
};

// Function to send a batch of emails to the API
const sendBatchToApi = async (emailBatch) => {
    try {
        const response = await fetch('http://localhost:8000/validate-emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ emails: emailBatch }), // Sending the batch as a JSON object
        });

        const data = await response.json();
        console.log('Batch Response:', data);
        setResponseData(prev => [...prev, ...data.results]); // Append new results to previous ones
        setShowData(prev => [...prev, ...data.results]); // Update UI with new data

    } catch (error) {
        console.error('Error sending batch:', error);
    }
};

    // single verify route

    const singleVerify = async () => 
        {       

        setLoading(true);
        let obj = {"email":email}

        try {
            const response = await fetch('http://localhost:8000/validate-email', {
                method: 'POST',
                headers: {
            'Content-Type': 'application/json',
          },
                body: JSON.stringify(obj),
            });
            const data = await response.json();
            console.log('Response:', data);
            setResponseData([data])
            setShowData([data])
        } catch (error) {
            console.error('Error uploading file:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container my-4">
          {loading && <div class="spinner-border" role="status">
  <span class="visually-hidden">Loading...</span>
</div>}

            <div className="card">
  <div className="card-body">
    <div className='d-flex'>
        {/* <button>Single Validation</button> */}
        <select aria-label="Default select example" onChange={e=>{filterData(e.target.value)}}>
  <option selected disabled>Select State</option>
  <option value="Yes">Deliverable</option>
  <option value="No">Not Deliverable</option>
</select>
        <button className='btn btn-primary mx-2' onClick={e=>{setBatchStatus(true)}}>Batch Validation</button>
        <button className='btn btn-primary mx-2' onClick={e=>{setBatchStatus(false)}}>Single Validation</button>
{filterStatus && <button className='btn btn-primary' onClick={handleDownload}>Extract Data</button>}
    </div>
    <hr/>
  <h2>Email Validator</h2>

 {batchStatus ? <div class="input-group">
  <input type="file" class="form-control"  accept=".csv, .xlsx"
                onChange={handleFileChange}  id="inputGroupFile04" aria-describedby="inputGroupFileAddon04" aria-label="Upload"/>
  <button class="btn btn-outline-secondary" type="button" id="inputGroupFileAddon04" onClick={handleVerify} disabled={loading}>{loading ? 'Verifying...' : 'Verify Emails'}</button>
</div>:<>
           <input type="text" onChange={e=>{getEmail(e.target.value)}}/>
           
            <button onClick={singleVerify} disabled={loading} className='btn btn-primary mx-2'>
                {loading ? 'Verifying...' : 'Verify Email'}
            </button>
            </>}

  </div>
</div>

{
    showData.length>0 &&
    <div className='table-container'>
    <table className="table mt-4">
  <thead>
    <tr>
      <th scope="col">No.</th>
      <th scope="col">Email</th>
      <th scope="col">Deliverable</th>
    </tr>
  </thead>
  <tbody>
    {
        showData.map((data,index)=>{
            return(
                <tr>
                <th scope="row">{index+1}</th>
               <td>{data.email}</td>
               <td className={`${data.deliverable?(data.deliverable=="No"?"text-danger":"text-success"):"text-danger"}`}>{data.deliverable?data.deliverable:"No"}</td>
              </tr>
            )
        })
    }
   
  
  </tbody>
</table>
</div>
}
        </div>
    );
};

export default EmailBatch;
