import { useState } from 'react'

export default function App() {

  return (
    <div>
      <ImageUpload/>
    </div>
  )
}

function SvgUpload() {
 const [selectedFile, setSelectedFile] = useState(null);
 const [selectedName, setSelectedName] = useState('');
 const [filesize, setFileSize] = useState('');
 const handleFileChange = (event) => {
   const file = event.target.files[0];
   setSelectedFile(file);
   setSelectedName(file.name);
   console.log(file);

   setFileSize(((file.size)/1000).toFixed(1) + 'KB');
 };
 return (
   <div className="file-upload">
     <h3>{selectedName || "Click box to upload"}</h3>
     <input type="file" onChange={handleFileChange} />
     <div> {filesize}
     </div>
     <div>
     </div>
   </div>
 );
}

function ImageUpload() {
    const [file, setFile] = useState(null);

    function handleChange(e) {
        console.log(e.target.files);
        setFile(URL.createObjectURL(e.target.files[0]));
    }

    return (
        <div className="fileupload">
            <h2>Add Image:</h2>
            <input type="file" onChange={handleChange} />
            {file && <img src={file} alt="Uploaded preview" />}
        </div>
    );
}