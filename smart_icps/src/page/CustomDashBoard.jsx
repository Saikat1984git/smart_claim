import React from "react";
import ChatSection from "../components/dashboard/ChatSection";
import GraphDashboardComponent from "../components/dashboard/GraphDashboardComponent";



const  CustomDashBoard= (props) => {
    return (
       <div className="CustomDashBoard">
        {/* <ChatSection/> */}
        <GraphDashboardComponent/>
       </div>
    );
}
export default CustomDashBoard;